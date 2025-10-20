import { db } from '../utils/database.js';





// 활성화된 액티비티 이미지 가져오기 (공개용)
export async function getActiveActivities() {
  try {
    const activities = await db.query(`
      SELECT id, image_url, title, link_url, size, display_order
      FROM activity_images
      WHERE is_active = TRUE
      ORDER BY display_order ASC, created_at DESC
    `);

    return {
      success: true,
      activities: activities || []
    };
  } catch (error) {
    console.error('Get active activities error:', error);
    return {
      success: false,
      error: 'Failed to fetch activities',
      activities: []
    };
  }
}

// 모든 액티비티 이미지 가져오기 (관리자용)
export async function getAllActivities() {
  try {
    const activities = await db.query(`
      SELECT id, image_url, title, link_url, size, display_order, is_active, created_at
      FROM activity_images
      ORDER BY display_order ASC, created_at DESC
    `);

    return {
      success: true,
      activities: activities || []
    };
  } catch (error) {
    console.error('Get all activities error:', error);
    return {
      success: false,
      error: 'Failed to fetch activities',
      activities: []
    };
  }
}

// 특정 액티비티 이미지 가져오기
export async function getActivityById(id) {
  try {
    const activities = await db.query(
      `SELECT * FROM activity_images WHERE id = ?`,
      [id]
    );

    if (!activities || activities.length === 0) {
      return {
        success: false,
        error: 'Activity not found'
      };
    }

    return {
      success: true,
      activity: activities[0]
    };
  } catch (error) {
    console.error('Get activity by id error:', error);
    return {
      success: false,
      error: 'Failed to fetch activity'
    };
  }
}

// 액티비티 이미지 생성
export async function createActivity(data) {
  try {
    const result = await db.query(
      `INSERT INTO activity_images (image_url, title, link_url, size, display_order, is_active)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        data.image_url,
        data.title,
        data.link_url || null,
        data.size,
        data.display_order || 0,
        data.is_active !== undefined ? data.is_active : true
      ]
    );

    return {
      success: true,
      activity: {
        id: result[0]?.id || 0,
        ...data,
        display_order: data.display_order || 0,
        is_active: data.is_active !== undefined ? data.is_active : true
      }
    };
  } catch (error) {
    console.error('Create activity error:', error);
    return {
      success: false,
      error: 'Failed to create activity'
    };
  }
}

// 액티비티 이미지 수정
export async function updateActivity(id, data) {
  try {
    const fields = [];
    const values = [];

    if (data.image_url !== undefined) {
      fields.push('image_url = ?');
      values.push(data.image_url);
    }
    if (data.title !== undefined) {
      fields.push('title = ?');
      values.push(data.title);
    }
    if (data.link_url !== undefined) {
      fields.push('link_url = ?');
      values.push(data.link_url);
    }
    if (data.size !== undefined) {
      fields.push('size = ?');
      values.push(data.size);
    }
    if (data.display_order !== undefined) {
      fields.push('display_order = ?');
      values.push(data.display_order);
    }
    if (data.is_active !== undefined) {
      fields.push('is_active = ?');
      values.push(data.is_active);
    }

    if (fields.length === 0) {
      return {
        success: false,
        error: 'No fields to update'
      };
    }

    values.push(id);

    await db.query(
      `UPDATE activity_images SET ${fields.join(', ')} WHERE id = ?`,
      values
    );

    return {
      success: true,
      activity: { id, ...data }
    };
  } catch (error) {
    console.error('Update activity error:', error);
    return {
      success: false,
      error: 'Failed to update activity'
    };
  }
}

// 액티비티 이미지 삭제
export async function deleteActivity(id) {
  try {
    await db.query(`DELETE FROM activity_images WHERE id = ?`, [id]);

    return {
      success: true
    };
  } catch (error) {
    console.error('Delete activity error:', error);
    return {
      success: false,
      error: 'Failed to delete activity'
    };
  }
}

// 액티비티 이미지 순서 변경
export async function reorderActivities(orders) {
  try {
    for (const order of orders) {
      await db.query(
        `UPDATE activity_images SET display_order = ? WHERE id = ?`,
        [order.display_order, order.id]
      );
    }

    return {
      success: true
    };
  } catch (error) {
    console.error('Reorder activities error:', error);
    return {
      success: false,
      error: 'Failed to reorder activities'
    };
  }
}

