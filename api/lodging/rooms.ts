/**
 * 객실(Rooms) 관리 API
 */

import { db } from '../../utils/database-cloud';

export interface Room {
  id?: number;
  lodging_id: number;
  name: string;
  type: 'single' | 'double' | 'twin' | 'suite' | 'family' | 'dormitory' | 'camping_site';
  description?: string;
  capacity: number;
  max_capacity: number;
  bed_type?: string;
  bed_count?: number;
  size_sqm?: number;
  floor?: number;
  thumbnail_url?: string;
  images?: string[];
  amenities?: Record<string, boolean>;
  total_rooms: number;
  is_active?: boolean;
  display_order?: number;
}

export async function getRooms(lodgingId: number) {
  try {
    const rooms = await db.query(`
      SELECT * FROM rooms WHERE lodging_id = ? ORDER BY display_order, id
    `, [lodgingId]);

    return { success: true, rooms };
  } catch (error) {
    console.error('❌ 객실 목록 조회 실패:', error);
    return { success: false, message: '객실 목록 조회 실패' };
  }
}

export async function createRoom(room: Room, userId: number) {
  try {
    // 권한 확인
    const lodging = await db.query(`
      SELECT l.vendor_id, v.user_id
      FROM lodgings l
      JOIN rentcar_vendors v ON l.vendor_id = v.id
      WHERE l.id = ?
    `, [room.lodging_id]);

    if (lodging.length === 0 || lodging[0].user_id !== userId) {
      return { success: false, message: '권한이 없습니다.' };
    }

    const result = await db.execute(`
      INSERT INTO rooms (
        lodging_id, name, type, description,
        capacity, max_capacity, bed_type, bed_count,
        size_sqm, floor, thumbnail_url, images, amenities,
        total_rooms, is_active, display_order,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
    `, [
      room.lodging_id, room.name, room.type, room.description || null,
      room.capacity, room.max_capacity,
      room.bed_type || 'double', room.bed_count || 1,
      room.size_sqm || null, room.floor || null,
      room.thumbnail_url || null,
      room.images ? JSON.stringify(room.images) : null,
      room.amenities ? JSON.stringify(room.amenities) : null,
      room.total_rooms, room.is_active !== false,
      room.display_order || 0
    ]);

    console.log(`✅ 객실 생성 완료: ${room.name} (ID: ${result.insertId})`);
    return { success: true, roomId: result.insertId, message: '객실이 생성되었습니다.' };

  } catch (error) {
    console.error('❌ 객실 생성 실패:', error);
    return { success: false, message: '객실 생성 실패' };
  }
}

export async function updateRoom(roomId: number, userId: number, updateData: Partial<Room>) {
  try {
    const room = await db.query(`
      SELECT r.lodging_id, l.vendor_id, v.user_id
      FROM rooms r
      JOIN lodgings l ON r.lodging_id = l.id
      JOIN rentcar_vendors v ON l.vendor_id = v.id
      WHERE r.id = ?
    `, [roomId]);

    if (room.length === 0 || room[0].user_id !== userId) {
      return { success: false, message: '권한이 없습니다.' };
    }

    const fields: string[] = [];
    const values: any[] = [];

    if (updateData.name) { fields.push('name = ?'); values.push(updateData.name); }
    if (updateData.type) { fields.push('type = ?'); values.push(updateData.type); }
    if (updateData.description !== undefined) { fields.push('description = ?'); values.push(updateData.description); }
    if (updateData.capacity) { fields.push('capacity = ?'); values.push(updateData.capacity); }
    if (updateData.max_capacity) { fields.push('max_capacity = ?'); values.push(updateData.max_capacity); }
    if (updateData.total_rooms) { fields.push('total_rooms = ?'); values.push(updateData.total_rooms); }
    if (updateData.is_active !== undefined) { fields.push('is_active = ?'); values.push(updateData.is_active); }

    fields.push('updated_at = NOW()');
    values.push(roomId);

    if (fields.length === 1) {
      return { success: false, message: '업데이트할 정보가 없습니다.' };
    }

    await db.execute(`UPDATE rooms SET ${fields.join(', ')} WHERE id = ?`, values);
    console.log(`✅ 객실 수정 완료: ID ${roomId}`);

    return { success: true, message: '객실이 수정되었습니다.' };

  } catch (error) {
    console.error('❌ 객실 수정 실패:', error);
    return { success: false, message: '객실 수정 실패' };
  }
}

export async function deleteRoom(roomId: number, userId: number) {
  try {
    const room = await db.query(`
      SELECT r.lodging_id, l.vendor_id, v.user_id
      FROM rooms r
      JOIN lodgings l ON r.lodging_id = l.id
      JOIN rentcar_vendors v ON l.vendor_id = v.id
      WHERE r.id = ?
    `, [roomId]);

    if (room.length === 0 || room[0].user_id !== userId) {
      return { success: false, message: '권한이 없습니다.' };
    }

    await db.execute(`DELETE FROM rooms WHERE id = ?`, [roomId]);
    console.log(`✅ 객실 삭제 완료: ID ${roomId}`);

    return { success: true, message: '객실이 삭제되었습니다.' };

  } catch (error) {
    console.error('❌ 객실 삭제 실패:', error);
    return { success: false, message: '객실 삭제 실패' };
  }
}
