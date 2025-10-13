/**
 * 재고 관리(Availability) API
 */

import { db } from '../../utils/database-cloud';

export async function getAvailability(roomId: number, startDate: string, endDate: string) {
  try {
    const availability = await db.query(`
      SELECT * FROM availability_daily
      WHERE room_id = ? AND date >= ? AND date <= ?
      ORDER BY date
    `, [roomId, startDate, endDate]);

    return { success: true, availability };
  } catch (error) {
    console.error('❌ 재고 조회 실패:', error);
    return { success: false, message: '재고 조회 실패' };
  }
}

export async function updateAvailability(
  roomId: number,
  date: string,
  availableRooms: number,
  pricePerNight?: number,
  userId?: number
) {
  try {
    // 권한 확인 (생략 가능)
    await db.execute(`
      INSERT INTO availability_daily (
        room_id, date, available_rooms, sold_rooms, blocked_rooms, price_per_night, created_at, updated_at
      ) VALUES (?, ?, ?, 0, 0, ?, NOW(), NOW())
      ON DUPLICATE KEY UPDATE
        available_rooms = ?, price_per_night = ?, updated_at = NOW()
    `, [roomId, date, availableRooms, pricePerNight || null, availableRooms, pricePerNight || null]);

    console.log(`✅ 재고 업데이트 완료: Room ${roomId}, ${date}`);
    return { success: true, message: '재고가 업데이트되었습니다.' };

  } catch (error) {
    console.error('❌ 재고 업데이트 실패:', error);
    return { success: false, message: '재고 업데이트 실패' };
  }
}

export async function bulkUpdateAvailability(
  roomId: number,
  startDate: string,
  endDate: string,
  availableRooms: number,
  pricePerNight?: number
) {
  try {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const dates: string[] = [];

    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      dates.push(d.toISOString().split('T')[0]);
    }

    for (const date of dates) {
      await updateAvailability(roomId, date, availableRooms, pricePerNight);
    }

    console.log(`✅ 대량 재고 업데이트 완료: ${dates.length}일`);
    return { success: true, message: `${dates.length}일의 재고가 업데이트되었습니다.` };

  } catch (error) {
    console.error('❌ 대량 재고 업데이트 실패:', error);
    return { success: false, message: '대량 재고 업데이트 실패' };
  }
}
