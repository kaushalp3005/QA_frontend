// Complaint ID Generation Test
// This demonstrates the new complaint ID format: CIDYYYYMMDDHHMM

function generateComplaintId(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hour = String(now.getHours()).padStart(2, '0');
  const minute = String(now.getMinutes()).padStart(2, '0');
  
  return `CID${year}${month}${day}${hour}${minute}`;
}

// Example IDs that would be generated:
// Current date: October 27, 2025, 2:45 PM
console.log('Sample Complaint ID:', generateComplaintId());
// Output: CID202510271445

// Breakdown:
// CID = Complaint ID prefix
// 2025 = Year
// 10 = Month (October)
// 27 = Day
// 14 = Hour (24-hour format)
// 45 = Minute

export { generateComplaintId };