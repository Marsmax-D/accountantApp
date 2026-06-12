import { type SQLiteDatabase } from 'expo-sqlite';
import { supabase } from '@/supabase/client';
import { createTransactionRepo, type SyncContext } from '@/db/transaction-repo';
import { createCategoryRepo } from '@/db/category-repo';
import { generateUUID, generateInviteCode } from '@/utils/uuid';

interface SyncMeta {
  userId: string;
  nickname: string;
  familyId: string;
  familyName: string;
  inviteCode: string;
  role: string;
  lastPullCursor: string;
}

export async function readSyncMeta(db: SQLiteDatabase): Promise<Partial<SyncMeta>> {
  const rows = await db.getAllAsync<{ key: string; value: string }>(
    'SELECT key, value FROM sync_meta'
  );
  const meta: Record<string, string> = {};
  for (const row of rows) {
    meta[row.key] = row.value;
  }
  return {
    userId: meta['user_id'],
    nickname: meta['nickname'],
    familyId: meta['family_id'],
    familyName: meta['family_name'],
    inviteCode: meta['invite_code'],
    role: meta['role'],
    lastPullCursor: meta['last_pull_cursor'] || '0',
  };
}

export async function writeSyncMeta(db: SQLiteDatabase, updates: Record<string, string>): Promise<void> {
  for (const [key, value] of Object.entries(updates)) {
    await db.runAsync(
      'INSERT OR REPLACE INTO sync_meta (key, value) VALUES (?, ?)',
      key, value
    );
  }
}

export async function getSyncContext(db: SQLiteDatabase): Promise<SyncContext | undefined> {
  const meta = await readSyncMeta(db);
  if (!meta.familyId || !meta.userId) return undefined;
  return { familyId: meta.familyId, userId: meta.userId };
}

// ===== 分类映射辅助 =====

/** 根据本地 category_id 查询对应的云端 UUID */
async function localCatIdToRemote(db: SQLiteDatabase, localId: number): Promise<string | null> {
  const row = await db.getFirstAsync<{ remote_id: string }>(
    'SELECT remote_id FROM categories WHERE id = ? AND remote_id IS NOT NULL', localId
  );
  return row?.remote_id ?? null;
}

/** 根据云端 category UUID 查询本地 category_id */
async function remoteToLocalCatId(db: SQLiteDatabase, remoteId: string): Promise<number | null> {
  const row = await db.getFirstAsync<{ id: number }>(
    'SELECT id FROM categories WHERE remote_id = ?', remoteId
  );
  return row?.id ?? null;
}

/** 将本地所有分类推送到云端并记录 remote_id（确保分类映射可用） */
export async function ensureCategoryRemoteIds(db: SQLiteDatabase, syncCtx: SyncContext): Promise<void> {
  const cats = await db.getAllAsync<{
    id: number; name: string; type: string; source: string;
    icon: string | null; color: string | null; sort_order: number;
    is_system: number; channel: string; remote_id: string | null;
  }>('SELECT * FROM categories');

  for (const cat of cats) {
    const remoteId = cat.remote_id || generateUUID();

    const { error } = await supabase
      .from('remote_categories')
      .upsert({
        id: remoteId,
        family_id: syncCtx.familyId,
        name: cat.name,
        type: cat.type || 'income',
        source: cat.source || 'both',
        icon: cat.icon ?? null,
        color: cat.color ?? null,
        sort_order: cat.sort_order || 0,
        is_system: cat.is_system || 0,
        channel: cat.channel || 'online',
        created_by: syncCtx.userId,
        updated_by: syncCtx.userId,
        deleted_at: null,
      }, { onConflict: 'id' });

    if (error) throw new Error(`推送分类失败: ${error.message}`);

    if (!cat.remote_id) {
      await db.runAsync(
        'UPDATE categories SET remote_id = ? WHERE id = ?',
        remoteId, cat.id
      );
    }
  }
}

// ===== Push: 本地 → 云端 =====

export async function pushChanges(db: SQLiteDatabase): Promise<{ pushed: number; errors: string[] }> {
  const syncCtx = await getSyncContext(db);
  if (!syncCtx) return { pushed: 0, errors: [] };

  const txRepo = createTransactionRepo(db, syncCtx);
  const catRepo = createCategoryRepo(db, syncCtx);
  const errors: string[] = [];
  let pushed = 0;

  // Get pending sync operations
  const ops = await db.getAllAsync<{
    id: number;
    table_name: string;
    local_id: number;
    remote_id: string | null;
    operation: string;
    payload: string;
  }>('SELECT * FROM sync_operations ORDER BY id ASC');

  for (const op of ops) {
    try {
      const payload = JSON.parse(op.payload);

      if (op.table_name === 'transactions') {
        await pushTransaction(db, op.remote_id!, op.operation, payload, syncCtx);
        await db.runAsync("UPDATE transactions SET sync_status = 'synced' WHERE id = ?", op.local_id);
      } else if (op.table_name === 'categories') {
        await pushCategory(op.remote_id!, op.operation, payload, syncCtx);
        await db.runAsync("UPDATE categories SET sync_status = 'synced' WHERE id = ?", op.local_id);
      }

      await db.runAsync('DELETE FROM sync_operations WHERE id = ?', op.id);
      pushed++;
    } catch (err: any) {
      errors.push(`[${op.table_name}:${op.local_id}] ${err.message}`);
    }
  }

  return { pushed, errors };
}

async function pushTransaction(
  db: SQLiteDatabase,
  remoteId: string,
  operation: string,
  payload: any,
  syncCtx: SyncContext
): Promise<void> {
  if (operation === 'DELETE') {
    const { error } = await supabase
      .from('remote_transactions')
      .update({ deleted_at: new Date().toISOString(), updated_by: syncCtx.userId })
      .eq('id', remoteId);
    if (error) throw new Error(error.message);
    return;
  }

  // 解析本地 category_id → 云端 UUID
  const categoryId = payload.category_id
    ? await localCatIdToRemote(db, payload.category_id)
    : null;

  const record = {
    id: remoteId,
    family_id: syncCtx.familyId,
    amount: payload.amount,
    type: payload.type || 'income',
    category_id: categoryId,
    source: payload.source || 'manual',
    date: payload.date,
    note: payload.note ?? null,
    order_id: payload.order_id ?? null,
    wechat_raw: payload.wechat_raw ?? null,
    created_by: payload.created_by || syncCtx.userId,
    updated_by: syncCtx.userId,
    deleted_at: null,
  };

  const { error } = await supabase
    .from('remote_transactions')
    .upsert(record, { onConflict: 'id' });

  if (error) throw new Error(error.message);
}

async function pushCategory(
  remoteId: string,
  operation: string,
  payload: any,
  syncCtx: SyncContext
): Promise<void> {
  if (operation === 'DELETE') {
    const { error } = await supabase
      .from('remote_categories')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', remoteId);
    if (error) throw new Error(error.message);
    return;
  }

  const record = {
    id: remoteId,
    family_id: syncCtx.familyId,
    name: payload.name,
    type: payload.type || 'income',
    source: payload.source || 'both',
    icon: payload.icon ?? null,
    color: payload.color ?? null,
    sort_order: payload.sort_order || 0,
    is_system: payload.is_system || 0,
    channel: payload.channel || 'online',
    created_by: payload.created_by || syncCtx.userId,
    updated_by: syncCtx.userId,
    deleted_at: null,
  };

  const { error } = await supabase
    .from('remote_categories')
    .upsert(record, { onConflict: 'id' });

  if (error) throw new Error(error.message);
}

// ===== Pull: 云端 → 本地 =====

export async function pullChanges(db: SQLiteDatabase): Promise<{ pulled: number }> {
  const syncCtx = await getSyncContext(db);
  if (!syncCtx) return { pulled: 0 };

  const meta = await readSyncMeta(db);
  const lastCursor = parseInt(meta.lastPullCursor || '0', 10);
  const txRepo = createTransactionRepo(db, syncCtx);
  const catRepo = createCategoryRepo(db, syncCtx);
  let pulled = 0;

  // Query sync_journal for changes since last pull
  const { data: journals, error } = await supabase
    .from('sync_journal')
    .select('*')
    .eq('family_id', syncCtx.familyId)
    .neq('changed_by', syncCtx.userId)
    .gt('id', lastCursor)
    .order('id', { ascending: true })
    .limit(500);

  if (error) {
    console.error('Pull journal error:', error.message);
    return { pulled };
  }

  let newCursor = lastCursor;

  for (const entry of (journals || [])) {
    try {
      if (entry.table_name === 'transactions') {
        const { data: records } = await supabase
          .from('remote_transactions')
          .select('*')
          .eq('id', entry.record_id);

        if (records && records.length > 0) {
          // 解析云端 category UUID → 本地 category_id
          const localCatId = records[0].category_id
            ? await remoteToLocalCatId(db, records[0].category_id)
            : null;

          await txRepo.upsertFromRemote({
            remote_id: records[0].id,
            amount: records[0].amount,
            type: records[0].type,
            category_id: localCatId ?? 8,
            source: records[0].source,
            date: records[0].date,
            note: records[0].note,
            order_id: records[0].order_id,
            wechat_raw: records[0].wechat_raw,
            created_by: records[0].created_by,
            updated_at: records[0].updated_at,
            deleted_at: records[0].deleted_at,
          });
        } else {
          // Record was hard-deleted (should not happen with soft delete, but handle)
          await txRepo.upsertFromRemote({
            remote_id: entry.record_id,
            amount: 0, type: 'income', category_id: 8, source: 'manual',
            date: '', note: null, order_id: null, wechat_raw: null,
            created_by: '', updated_at: '', deleted_at: new Date().toISOString(),
          });
        }
      } else if (entry.table_name === 'categories') {
        const { data: records } = await supabase
          .from('remote_categories')
          .select('*')
          .eq('id', entry.record_id);

        if (records && records.length > 0) {
          await catRepo.upsertFromRemote({
            remote_id: records[0].id,
            name: records[0].name,
            type: records[0].type,
            source: records[0].source,
            icon: records[0].icon,
            color: records[0].color,
            sort_order: records[0].sort_order,
            is_system: records[0].is_system,
            channel: records[0].channel,
            created_by: records[0].created_by,
            updated_at: records[0].updated_at,
            deleted_at: records[0].deleted_at,
          });
        }
      }

      pulled++;
      if (entry.id > newCursor) newCursor = entry.id;
    } catch (err: any) {
      console.error(`Pull error [${entry.table_name}:${entry.record_id}]:`, err.message);
    }
  }

  // Update cursor
  if (newCursor > lastCursor) {
    await writeSyncMeta(db, { last_pull_cursor: String(newCursor) });
  }

  return { pulled };
}

// ===== 全量同步（首次加入家庭） =====

export async function fullSync(db: SQLiteDatabase): Promise<void> {
  const syncCtx = await getSyncContext(db);
  if (!syncCtx) return;

  const txRepo = createTransactionRepo(db, syncCtx);
  const catRepo = createCategoryRepo(db, syncCtx);

  // Pull all categories
  const { data: remoteCats } = await supabase
    .from('remote_categories')
    .select('*')
    .eq('family_id', syncCtx.familyId)
    .is('deleted_at', null);

  if (remoteCats) {
    for (const cat of remoteCats) {
      // 系统分类按名称匹配已有本地分类，避免重复
      if (cat.is_system) {
        const existing = await db.getFirstAsync<{ id: number }>(
          'SELECT id FROM categories WHERE is_system = 1 AND name = ? AND remote_id IS NULL',
          cat.name
        );
        if (existing) {
          await db.runAsync(
            `UPDATE categories SET remote_id = ?, name = ?, source = ?, icon = ?, color = ?,
               channel = ?, sync_status = 'synced' WHERE id = ?`,
            cat.id, cat.name, cat.source, cat.icon, cat.color,
            cat.channel, existing.id
          );
          continue;
        }
      }
      await catRepo.upsertFromRemote({
        remote_id: cat.id,
        name: cat.name,
        type: cat.type,
        source: cat.source,
        icon: cat.icon,
        color: cat.color,
        sort_order: cat.sort_order,
        is_system: cat.is_system,
        channel: cat.channel,
        created_by: cat.created_by,
        updated_at: cat.updated_at,
        deleted_at: cat.deleted_at,
      });
    }
  }

  // Pull all transactions
  const { data: remoteTxs } = await supabase
    .from('remote_transactions')
    .select('*')
    .eq('family_id', syncCtx.familyId)
    .is('deleted_at', null)
    .order('date', { ascending: false })
    .limit(1000);

  if (remoteTxs) {
    for (const tx of remoteTxs) {
      // 解析云端 category UUID → 本地 category_id
      const localCatId = tx.category_id
        ? await remoteToLocalCatId(db, tx.category_id)
        : null;

      await txRepo.upsertFromRemote({
        remote_id: tx.id,
        amount: tx.amount,
        type: tx.type,
        category_id: localCatId ?? 8,
        source: tx.source,
        date: tx.date,
        note: tx.note,
        order_id: tx.order_id,
        wechat_raw: tx.wechat_raw,
        created_by: tx.created_by,
        updated_at: tx.updated_at,
        deleted_at: tx.deleted_at,
      });
    }
  }

  // Set cursor to latest journal entry
  const { data: latestJournal } = await supabase
    .from('sync_journal')
    .select('id')
    .eq('family_id', syncCtx.familyId)
    .order('id', { ascending: false })
    .limit(1);

  if (latestJournal && latestJournal.length > 0) {
    await writeSyncMeta(db, { last_pull_cursor: String(latestJournal[0].id) });
  }
}

// ===== 家庭创建/加入 =====

export async function createFamily(
  db: SQLiteDatabase,
  familyName: string,
  ownerNickname: string,
  userId: string
): Promise<{ familyId: string; inviteCode: string }> {
  // Generate unique invite code
  let inviteCode = generateInviteCode();
  let attempts = 0;
  while (attempts < 10) {
    const { data } = await supabase
      .from('families')
      .select('id')
      .eq('invite_code', inviteCode)
      .limit(1);
    if (!data || data.length === 0) break;
    inviteCode = generateInviteCode();
    attempts++;
  }

  // Create family in Supabase
  const { data: family, error } = await supabase
    .from('families')
    .insert({
      name: familyName,
      invite_code: inviteCode,
      owner_nickname: ownerNickname,
    })
    .select('id')
    .single();

  if (error) throw new Error(`创建家庭失败: ${error.message}`);
  if (!family) throw new Error('创建家庭失败：未返回数据');

  // Register as member
  const { error: memberError } = await supabase
    .from('family_members')
    .insert({
      family_id: family.id,
      user_id: userId,
      nickname: ownerNickname,
      role: 'owner',
    });

  if (memberError) {
    // Cleanup: delete the family
    await supabase.from('families').delete().eq('id', family.id);
    throw new Error(`添加成员失败: ${memberError.message}`);
  }

  // Write sync meta
  await writeSyncMeta(db, {
    family_id: family.id,
    family_name: familyName,
    invite_code: inviteCode,
    role: 'owner',
    user_id: userId,
    nickname: ownerNickname,
  });

  // 将本地分类推送到云端并建立 remote_id 映射
  await ensureCategoryRemoteIds(db, { familyId: family.id, userId });

  return { familyId: family.id, inviteCode };
}

export async function joinFamily(
  db: SQLiteDatabase,
  inviteCode: string,
  nickname: string,
  userId: string
): Promise<{ familyId: string; familyName: string }> {
  // Lookup family by invite code
  const { data: families, error } = await supabase
    .from('families')
    .select('id, name')
    .eq('invite_code', inviteCode)
    .limit(1);

  if (error) throw new Error(`查找家庭失败: ${error.message}`);
  if (!families || families.length === 0) throw new Error('邀请码无效，未找到对应家庭');

  const family = families[0];

  // Check if already a member
  const { data: existing } = await supabase
    .from('family_members')
    .select('user_id')
    .eq('family_id', family.id)
    .eq('user_id', userId)
    .limit(1);

  if (existing && existing.length > 0) {
    throw new Error('你已经是该家庭的成员了');
  }

  // Join as member
  const { error: joinError } = await supabase
    .from('family_members')
    .insert({
      family_id: family.id,
      user_id: userId,
      nickname,
      role: 'member',
    });

  if (joinError) throw new Error(`加入家庭失败: ${joinError.message}`);

  // Write sync meta
  await writeSyncMeta(db, {
    family_id: family.id,
    family_name: family.name,
    invite_code: inviteCode,
    role: 'member',
    user_id: userId,
    nickname,
  });

  // Full sync to get existing data
  await fullSync(db);

  // 将本地分类推送到云端并建立 remote_id 映射（确保新增的自定义分类也有映射）
  await ensureCategoryRemoteIds(db, { familyId: family.id, userId });

  return { familyId: family.id, familyName: family.name };
}

export async function leaveFamily(db: SQLiteDatabase): Promise<void> {
  const meta = await readSyncMeta(db);
  if (!meta.familyId || !meta.userId) return;

  // Remove from Supabase
  await supabase
    .from('family_members')
    .delete()
    .eq('family_id', meta.familyId)
    .eq('user_id', meta.userId);

  // Clear local sync state
  await db.runAsync('DELETE FROM sync_meta');
  await db.runAsync('DELETE FROM sync_operations');
  await db.runAsync("UPDATE transactions SET sync_status = 'synced' WHERE sync_status != 'synced'");
  await db.runAsync("UPDATE categories SET sync_status = 'synced' WHERE sync_status != 'synced'");
}

export async function getFamilyMembers(familyId: string): Promise<any[]> {
  const { data, error } = await supabase
    .from('family_members')
    .select('user_id, nickname, role, joined_at')
    .eq('family_id', familyId)
    .order('joined_at', { ascending: true });

  if (error) throw new Error(`获取成员列表失败: ${error.message}`);
  return data || [];
}

export async function removeMember(familyId: string, userId: string): Promise<void> {
  const { error } = await supabase
    .from('family_members')
    .delete()
    .eq('family_id', familyId)
    .eq('user_id', userId);

  if (error) throw new Error(`移除成员失败: ${error.message}`);
}
