/**
 * PMS(Property Management System) 통합 모듈
 * 각 PMS 제공업체별 API 연동 로직
 */

// ============================================
// 1. CLOUDBEDS PMS
// ============================================
/**
 * CloudBeds API 동기화
 * Docs: https://hotels.cloudbeds.com/api/v1.2/docs/
 */
async function syncCloudBeds(vendor) {
  const baseUrl = 'https://hotels.cloudbeds.com/api/v1.2';
  const headers = {
    'Authorization': `Bearer ${vendor.pms_api_key}`,
    'Content-Type': 'application/json'
  };

  try {
    // 1. Get Room Types
    const roomTypesResponse = await fetch(`${baseUrl}/getRoomTypes`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        propertyID: vendor.pms_property_id
      })
    });

    if (!roomTypesResponse.ok) {
      throw new Error(`CloudBeds API error: ${roomTypesResponse.status}`);
    }

    const roomTypesData = await roomTypesResponse.json();

    if (!roomTypesData.success) {
      throw new Error(roomTypesData.message || 'Failed to fetch room types');
    }

    // 2. Transform CloudBeds data to our format
    const rooms = [];
    for (const roomType of roomTypesData.data || []) {
      rooms.push({
        room_code: roomType.roomTypeID || `CB-${roomType.roomTypeName}`,
        name: roomType.roomTypeName,
        type: mapCloudBedsRoomType(roomType.roomTypeName),
        capacity: parseInt(roomType.maxGuests) || 2,
        price: parseFloat(roomType.roomTypePrice) || 0,
        breakfast_included: roomType.breakfastIncluded === 'yes',
        description: roomType.roomTypeDescription || '',
        images: roomType.roomTypePicture ? [roomType.roomTypePicture] : []
      });
    }

    // 3. Get Reservations
    const reservationsResponse = await fetch(`${baseUrl}/getReservations`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        propertyID: vendor.pms_property_id,
        includeDetailedInfo: 1
      })
    });

    let bookings = [];
    if (reservationsResponse.ok) {
      const reservationsData = await reservationsResponse.json();
      bookings = (reservationsData.data || []).map(res => ({
        booking_code: res.reservationID,
        check_in: res.startDate,
        check_out: res.endDate,
        guest_name: res.guestName,
        guest_email: res.guestEmail,
        status: mapCloudBedsStatus(res.status),
        total_price: parseFloat(res.balance) || 0
      }));
    }

    return { rooms, bookings, errors: [] };

  } catch (error) {
    return {
      rooms: [],
      bookings: [],
      errors: [`CloudBeds sync error: ${error.message}`]
    };
  }
}

function mapCloudBedsRoomType(typeName) {
  const lower = (typeName || '').toLowerCase();
  if (lower.includes('suite')) return 'suite';
  if (lower.includes('deluxe')) return 'deluxe';
  if (lower.includes('villa')) return 'villa';
  if (lower.includes('standard')) return 'standard';
  return 'other';
}

function mapCloudBedsStatus(status) {
  const statusMap = {
    'confirmed': 'confirmed',
    'not_confirmed': 'pending',
    'canceled': 'cancelled',
    'checked_in': 'confirmed',
    'checked_out': 'completed',
    'no_show': 'cancelled'
  };
  return statusMap[status] || 'pending';
}

// ============================================
// 2. ORACLE OPERA PMS
// ============================================
/**
 * Oracle OPERA OHIP API 동기화
 * Docs: https://github.com/oracle/hospitality-api-docs
 */
async function syncOpera(vendor) {
  // OPERA는 OHIP (Oracle Hospitality Integration Platform) 사용
  const baseUrl = vendor.api_url || 'https://ohip-api.oracle.com/ops/v1';
  const headers = {
    'Authorization': `Bearer ${vendor.pms_api_key}`,
    'Content-Type': 'application/json',
    'x-app-key': vendor.pms_property_id // OPERA uses app key
  };

  try {
    // 1. Get Room Types
    const roomsResponse = await fetch(`${baseUrl}/hotels/${vendor.pms_property_id}/roomTypes`, {
      headers
    });

    if (!roomsResponse.ok) {
      throw new Error(`OPERA API error: ${roomsResponse.status}`);
    }

    const roomsData = await roomsResponse.json();

    const rooms = (roomsData.roomTypes || []).map(room => ({
      room_code: room.roomType,
      name: room.longDescription || room.shortDescription,
      type: mapOperaRoomType(room.roomType),
      capacity: parseInt(room.maxOccupancy) || 2,
      price: parseFloat(room.sellRate?.amount) || 0,
      breakfast_included: room.features?.includes('BREAKFAST') || false,
      description: room.longDescription || '',
      images: room.images || []
    }));

    // 2. Get Reservations
    const reservationsResponse = await fetch(
      `${baseUrl}/hotels/${vendor.pms_property_id}/reservations?status=RESERVED,INHOUSE`,
      { headers }
    );

    let bookings = [];
    if (reservationsResponse.ok) {
      const reservationsData = await reservationsResponse.json();
      bookings = (reservationsData.reservations || []).map(res => ({
        booking_code: res.confirmationNumber,
        check_in: res.arrivalDate,
        check_out: res.departureDate,
        guest_name: `${res.guestName.firstName} ${res.guestName.lastName}`,
        guest_email: res.emailAddress,
        status: mapOperaStatus(res.reservationStatus),
        total_price: parseFloat(res.totalAmount?.amount) || 0
      }));
    }

    return { rooms, bookings, errors: [] };

  } catch (error) {
    return {
      rooms: [],
      bookings: [],
      errors: [`OPERA sync error: ${error.message}`]
    };
  }
}

function mapOperaRoomType(typeCode) {
  const code = (typeCode || '').toUpperCase();
  if (code.includes('SUI')) return 'suite';
  if (code.includes('DLX')) return 'deluxe';
  if (code.includes('VIL')) return 'villa';
  if (code.includes('STD')) return 'standard';
  return 'other';
}

function mapOperaStatus(status) {
  const statusMap = {
    'RESERVED': 'confirmed',
    'WAITLISTED': 'pending',
    'INHOUSE': 'confirmed',
    'CHECKED_OUT': 'completed',
    'CANCELLED': 'cancelled',
    'NO_SHOW': 'cancelled'
  };
  return statusMap[status] || 'pending';
}

// ============================================
// 3. MEWS PMS
// ============================================
/**
 * Mews Connector API 동기화
 * Docs: https://mews-systems.gitbook.io/connector-api
 */
async function syncMews(vendor) {
  const baseUrl = vendor.api_url || 'https://api.mews.com/api/connector/v1';
  const headers = {
    'Content-Type': 'application/json'
  };

  const requestBody = {
    ClientToken: vendor.pms_api_key,
    AccessToken: vendor.pms_property_id, // Mews uses AccessToken for enterprise access
    Client: 'TravleapPMS'
  };

  try {
    // 1. Get Space Categories (Rooms)
    const spacesResponse = await fetch(`${baseUrl}/spaceCategories/getAll`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        ...requestBody,
        EnterpriseIds: [vendor.pms_property_id]
      })
    });

    if (!spacesResponse.ok) {
      throw new Error(`Mews API error: ${spacesResponse.status}`);
    }

    const spacesData = await spacesResponse.json();

    const rooms = (spacesData.SpaceCategories || []).map(space => ({
      room_code: space.Id,
      name: space.Name,
      type: mapMewsSpaceType(space.Name),
      capacity: parseInt(space.Capacity) || 2,
      price: parseFloat(space.BasePrice?.Value) || 0,
      breakfast_included: false, // Mews handles this as products
      description: space.Description || '',
      images: space.ImageIds || []
    }));

    // 2. Get Reservations
    const reservationsResponse = await fetch(`${baseUrl}/reservations/getAll`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        ...requestBody,
        EnterpriseIds: [vendor.pms_property_id],
        States: ['Confirmed', 'Started', 'Processed']
      })
    });

    let bookings = [];
    if (reservationsResponse.ok) {
      const reservationsData = await reservationsResponse.json();
      bookings = (reservationsData.Reservations || []).map(res => ({
        booking_code: res.Number || res.Id,
        check_in: res.StartUtc?.split('T')[0],
        check_out: res.EndUtc?.split('T')[0],
        guest_name: res.Customer?.Name || 'Guest',
        guest_email: res.Customer?.Email || '',
        status: mapMewsStatus(res.State),
        total_price: parseFloat(res.TotalCost?.Value) || 0
      }));
    }

    return { rooms, bookings, errors: [] };

  } catch (error) {
    return {
      rooms: [],
      bookings: [],
      errors: [`Mews sync error: ${error.message}`]
    };
  }
}

function mapMewsSpaceType(name) {
  const lower = (name || '').toLowerCase();
  if (lower.includes('suite')) return 'suite';
  if (lower.includes('deluxe')) return 'deluxe';
  if (lower.includes('villa')) return 'villa';
  if (lower.includes('standard')) return 'standard';
  return 'other';
}

function mapMewsStatus(state) {
  const statusMap = {
    'Confirmed': 'confirmed',
    'Optional': 'pending',
    'Started': 'confirmed',
    'Processed': 'completed',
    'Canceled': 'cancelled'
  };
  return statusMap[state] || 'pending';
}

// ============================================
// 4. EZEE ABSOLUTE PMS
// ============================================
/**
 * eZee Absolute API 동기화
 * Docs: https://api.ezeetechnosys.com/
 */
async function syncEzee(vendor) {
  const baseUrl = vendor.api_url || 'https://live.ipms247.com/pmsinterface';

  try {
    // 1. Get Room Types
    const roomsUrl = `${baseUrl}/listing.php?request_type=RoomType&HotelCode=${vendor.pms_property_id}&APIKey=${vendor.pms_api_key}`;

    const roomsResponse = await fetch(roomsUrl, {
      method: 'POST'
    });

    if (!roomsResponse.ok) {
      throw new Error(`eZee API error: ${roomsResponse.status}`);
    }

    const roomsData = await roomsResponse.json();

    const rooms = (roomsData.RoomTypes || []).map(room => ({
      room_code: room.RoomTypeCode,
      name: room.RoomTypeName,
      type: mapEzeeRoomType(room.RoomTypeName),
      capacity: parseInt(room.MaxOccupancy) || 2,
      price: parseFloat(room.BaseRate) || 0,
      breakfast_included: room.BreakfastIncluded === 'true',
      description: room.Description || '',
      images: room.Images ? room.Images.split(',') : []
    }));

    // 2. Get Reservations
    const bookingsUrl = `${baseUrl}/listing.php?request_type=Booking&HotelCode=${vendor.pms_property_id}&APIKey=${vendor.pms_api_key}`;

    const bookingsResponse = await fetch(bookingsUrl, {
      method: 'POST'
    });

    let bookings = [];
    if (bookingsResponse.ok) {
      const bookingsData = await bookingsResponse.json();
      bookings = (bookingsData.Bookings || []).map(booking => ({
        booking_code: booking.BookingId,
        check_in: booking.CheckIn,
        check_out: booking.CheckOut,
        guest_name: booking.GuestName,
        guest_email: booking.GuestEmail,
        status: mapEzeeStatus(booking.Status),
        total_price: parseFloat(booking.TotalAmount) || 0
      }));
    }

    return { rooms, bookings, errors: [] };

  } catch (error) {
    return {
      rooms: [],
      bookings: [],
      errors: [`eZee sync error: ${error.message}`]
    };
  }
}

function mapEzeeRoomType(typeName) {
  const lower = (typeName || '').toLowerCase();
  if (lower.includes('suite')) return 'suite';
  if (lower.includes('deluxe')) return 'deluxe';
  if (lower.includes('villa')) return 'villa';
  if (lower.includes('standard')) return 'standard';
  return 'other';
}

function mapEzeeStatus(status) {
  const statusMap = {
    'Confirmed': 'confirmed',
    'Pending': 'pending',
    'CheckedIn': 'confirmed',
    'CheckedOut': 'completed',
    'Cancelled': 'cancelled',
    'NoShow': 'cancelled'
  };
  return statusMap[status] || 'pending';
}

// ============================================
// 5. CUSTOM API
// ============================================
/**
 * 커스텀 API 동기화
 * 표준 JSON 형식을 따르는 커스텀 PMS
 */
async function syncCustom(vendor) {
  const headers = {
    'Authorization': `Bearer ${vendor.pms_api_key}`,
    'Content-Type': 'application/json'
  };

  try {
    // 1. Get Rooms
    const roomsResponse = await fetch(`${vendor.api_url}/rooms`, { headers });

    if (!roomsResponse.ok) {
      throw new Error(`Custom API error: ${roomsResponse.status}`);
    }

    const roomsData = await roomsResponse.json();

    const rooms = (roomsData.rooms || roomsData.data || []).map(room => ({
      room_code: room.code || room.id || room.room_code,
      name: room.name || room.room_name,
      type: room.type || 'standard',
      capacity: parseInt(room.capacity || room.max_occupancy) || 2,
      price: parseFloat(room.price || room.base_price) || 0,
      breakfast_included: room.breakfast_included || false,
      description: room.description || '',
      images: room.images || []
    }));

    // 2. Get Bookings
    const bookingsResponse = await fetch(`${vendor.api_url}/bookings`, { headers });

    let bookings = [];
    if (bookingsResponse.ok) {
      const bookingsData = await bookingsResponse.json();
      bookings = (bookingsData.bookings || bookingsData.data || []).map(booking => ({
        booking_code: booking.code || booking.id || booking.booking_id,
        check_in: booking.check_in || booking.checkin_date,
        check_out: booking.check_out || booking.checkout_date,
        guest_name: booking.guest_name || booking.customer_name,
        guest_email: booking.guest_email || booking.customer_email,
        status: booking.status || 'pending',
        total_price: parseFloat(booking.total_price || booking.amount) || 0
      }));
    }

    return { rooms, bookings, errors: [] };

  } catch (error) {
    return {
      rooms: [],
      bookings: [],
      errors: [`Custom API sync error: ${error.message}`]
    };
  }
}

// ============================================
// MAIN SYNC FUNCTION
// ============================================
/**
 * PMS 동기화 메인 함수
 */
async function syncPMS(vendor) {
  switch (vendor.pms_provider) {
    case 'cloudbeds':
      return await syncCloudBeds(vendor);

    case 'opera':
      return await syncOpera(vendor);

    case 'mews':
      return await syncMews(vendor);

    case 'ezee':
      return await syncEzee(vendor);

    case 'custom':
      return await syncCustom(vendor);

    default:
      return {
        rooms: [],
        bookings: [],
        errors: [`Unsupported PMS provider: ${vendor.pms_provider}`]
      };
  }
}

module.exports = {
  syncPMS,
  syncCloudBeds,
  syncOpera,
  syncMews,
  syncEzee,
  syncCustom
};
