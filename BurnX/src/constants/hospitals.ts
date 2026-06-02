export type Hospital = {
  id: string;
  name: string;
  /** Shorter name for patient-facing headers (pilot: Mass General Hospital). */
  brandName?: string;
  address: string;
  phone: string;
  website: string;
  logoUrl: string;
};

/** Pilot default when profile has no hospital_id yet. */
export const DEFAULT_PILOT_HOSPITAL_ID =
  "d0260e57-15ef-468d-9e85-67b29366448e" as const;

export const hospitals: Hospital[] = [
  {
    id: DEFAULT_PILOT_HOSPITAL_ID,
    name: "Massachusetts General Brigham",
    brandName: "Mass General Hospital",
    address: "Boston, MA, US",
    phone: "+1-617-726-2000",
    website: "https://www.massgeneralbrigham.org/en",
    logoUrl:
      "https://i0.wp.com/commonwealthbeacon.org/wp-content/uploads/2021/04/Unknown-1.png?fit=225%2C225&ssl=1",
  },
  {
    id: "a44c1f2e-7ef8-4859-9cef-c7f2621c5371",
    name: "Mayo Clinic",
    address: "Rochester, MN, US",
    phone: "+1-507-284-2511",
    website: "https://www.mayoclinic.org",
    logoUrl:
      "https://upload.wikimedia.org/wikipedia/commons/thumb/c/c3/Mayo_Clinic_logo.svg/960px-Mayo_Clinic_logo.svg.png",
  },
  {
    id: "ebf52d72-adda-439d-9768-902178bb8103",
    name: "Johns Hopkins Hospital",
    address: "Baltimore, MD, US",
    phone: "+1-410-955-5000",
    website: "https://www.hopkinsmedicine.org",
    logoUrl:
      "https://upload.wikimedia.org/wikipedia/commons/1/1c/Hlogo.png",
  },
];

export function getHospitalById(id: string | undefined): Hospital | undefined {
  if (!id || typeof id !== "string" || id.trim() === "") return undefined;
  return hospitals.find((h) => h.id === id.trim());
}

export function resolvePatientHospital(hospitalId: string | undefined): Hospital {
  return getHospitalById(hospitalId) ?? hospitals[0]!;
}

export function hospitalDisplayName(hospital: Hospital): string {
  return hospital.brandName?.trim() || hospital.name;
}
