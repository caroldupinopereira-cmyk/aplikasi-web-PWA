export type ResidentQualityInput = {
  recordNumber: string; fullName: string; gender: string; birthDate: string;
  suco: string; aldeia: string; householdNumber: string;
  maritalStatus: string; occupation: string;
};

const labels: Array<[keyof ResidentQualityInput, string]> = [
  ["recordNumber", "Nomor data"], ["fullName", "Nama lengkap"],
  ["gender", "Jenis kelamin"], ["birthDate", "Tanggal lahir"],
  ["suco", "Suco"], ["aldeia", "Aldeia"],
  ["householdNumber", "Nomor keluarga"],
  ["maritalStatus", "Status perkawinan"], ["occupation", "Pekerjaan"],
];

export function residentCompleteness(record: ResidentQualityInput) {
  const missingFields = labels.filter(([field]) => !record[field]?.trim()).map(([, label]) => label);
  return {
    complete: missingFields.length === 0,
    missingFields,
    percent: Math.round(((labels.length - missingFields.length) / labels.length) * 100),
  };
}
