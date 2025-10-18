// Frontend stub for test-lock
export async function runAllLockTests() {
  console.log('Lock tests are disabled in production build');
  return { success: false, message: 'Not available in production' };
}

export default { runAllLockTests };
