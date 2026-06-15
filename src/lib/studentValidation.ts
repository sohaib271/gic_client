interface CommonStudentForm {
  name: string;
  lastName: string;
  email: string;
  password: string;
  cnic: string;
  phone: string;
  address: string;
  city: string;
  department: string;
  session: string;
  matricMarks: string;
  whatsappNumber: string;
}

export const getCommonStudentValidationError = (
  form: CommonStudentForm,
  isEdit: boolean,
  maxMatricMarks: number,
): string | null => {
  if (!form.name.trim() || !form.lastName.trim()) return "First name and last name are required";
  if (form.name.trim().length > 30) return "First name must not exceed 30 characters";
  if (form.lastName.trim().length > 30) return "Last name must not exceed 30 characters";
  if (!isEdit && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) return "Invalid email format";
  if (!isEdit && !form.password.trim()) return "Password is required";
  if (!/^\d{13}$/.test(form.cnic)) return "CNIC must be exactly 13 digits, no dashes";
  if (!/^(92\d{10}|0\d{10})$/.test(form.phone)) {
    return "Phone: 12 digits starting with 92, or 11 digits starting with 0";
  }
  if (!form.address.trim()) return "Address is required";
  if (!form.city.trim()) return "City is required";
  if (!form.department) return "Department is required";
  if (!form.session.trim()) return "Session is required";
  if (!form.matricMarks || Number.isNaN(Number(form.matricMarks))) return "Valid matric marks are required";
  if (Number(form.matricMarks) < 0 || Number(form.matricMarks) > maxMatricMarks) {
    return `Matric marks must be between 0 and ${maxMatricMarks}`;
  }
  if (form.whatsappNumber && !/^(92\d{10}|0\d{10})$/.test(form.whatsappNumber)) {
    return "WhatsApp number format is invalid";
  }
  return null;
};
