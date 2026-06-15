export interface Student {
  id: string;
  studentId: string;
  name: string;
  fatherName: string;
  class: string;
  doj: string;
  feePayment: string;
  phone: string;
  address: string;
  total: string;
  category: "intermediate" | "bs_adp";
}

export interface Subject {
  id: string;
  sno: number;
  subject: string;
  totalMarks: number;
  passingMarks: number;
}

export const students: Student[] = [
  { id: "1", studentId: "ST-001", name: "Ankit Dewangan", fatherName: "Dinesh Dewangan", class: "1st Year", doj: "25/08/2024", feePayment: "70000/-", phone: "+91 98429 61231", address: "123 Main St", total: "85%", category: "intermediate" },
  { id: "2", studentId: "ST-002", name: "Karthik Kashyap", fatherName: "Prem Lal Kashyap", class: "1st Year", doj: "06/07/2023", feePayment: "45000/-", phone: "+91 98429 61232", address: "456 Oak Ave", total: "92%", category: "intermediate" },
  { id: "3", studentId: "ST-003", name: "Kavita Sahoo", fatherName: "Gautam Sahoo", class: "2nd Year", doj: "20/09/2024", feePayment: "35000/-", phone: "+91 98429 61233", address: "789 Pine Rd", total: "67%", category: "intermediate" },
  { id: "4", studentId: "ST-004", name: "Neha Sobar", fatherName: "Haremath Sobar", class: "2nd Year", doj: "25/08/2024", feePayment: "70000/-", phone: "+91 98429 61234", address: "321 Elm St", total: "78%", category: "intermediate" },
  { id: "5", studentId: "ST-005", name: "Kunal Vishwakarma", fatherName: "Mohit Vishwakarma", class: "1st Year", doj: "01/08/2024", feePayment: "50000/-", phone: "+91 98429 61235", address: "654 Maple Dr", total: "55%", category: "intermediate" },
  { id: "6", studentId: "BS-001", name: "Rahul Mehta", fatherName: "Suresh Mehta", class: "BS-1st Semester", doj: "10/09/2020", feePayment: "60000/-", phone: "+91 98429 61236", address: "987 Cedar Ln", total: "90%", category: "bs_adp" },
  { id: "7", studentId: "BS-002", name: "Priya Sharma", fatherName: "Anil Sharma", class: "BS-2nd Semester", doj: "20/09/2024", feePayment: "45000/-", phone: "+91 98429 61237", address: "147 Birch Way", total: "45%", category: "bs_adp" },
  { id: "8", studentId: "BS-003", name: "Arun Joshi", fatherName: "Ramesh Joshi", class: "ADP-1st Semester", doj: "15/07/2023", feePayment: "55000/-", phone: "+91 98429 61238", address: "258 Walnut St", total: "72%", category: "bs_adp" },
  { id: "9", studentId: "BS-004", name: "Sneha Reddy", fatherName: "Venkat Reddy", class: "ADP-2nd Semester", doj: "03/01/2024", feePayment: "65000/-", phone: "+91 98429 61239", address: "369 Oak Blvd", total: "88%", category: "bs_adp" },
];

export const subjects: Subject[] = [
  { id: "1", sno: 1, subject: "Hindi", totalMarks: 100, passingMarks: 33 },
  { id: "2", sno: 2, subject: "English", totalMarks: 100, passingMarks: 33 },
  { id: "3", sno: 3, subject: "Maths", totalMarks: 100, passingMarks: 33 },
  { id: "4", sno: 4, subject: "Social Science", totalMarks: 100, passingMarks: 33 },
  { id: "5", sno: 5, subject: "Science", totalMarks: 100, passingMarks: 33 },
  { id: "6", sno: 6, subject: "Environment", totalMarks: 50, passingMarks: 17 },
];

export const interClasses = ["1st Year", "2nd Year"];
export const bsAdpClasses = ["BS-1st Semester", "BS-2nd Semester", "ADP-1st Semester", "ADP-2nd Semester"];
