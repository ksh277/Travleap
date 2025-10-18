// Frontend stub for notification functions
export async function notifyPartnerNewBooking(booking: any): Promise<boolean> {
  console.log('Notification disabled in frontend');
  return false;
}

export async function notifyCustomerBookingConfirmed(booking: any): Promise<void> {
  console.log('Notification disabled in frontend');
}

export async function notifyPartnerSettlement(partnerId: number, month: string, amount: number): Promise<void> {
  console.log('Notification disabled in frontend');
}
