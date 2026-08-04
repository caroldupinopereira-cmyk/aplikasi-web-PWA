import type { Locale } from "./i18n";

export const OUTGOING_TEMPLATE_KEYS = ["custom", "invitation", "notice", "recommendation", "assignment", "reply"] as const;
export type OutgoingTemplateKey = (typeof OUTGOING_TEMPLATE_KEYS)[number];

export const outgoingTemplateLabels: Record<OutgoingTemplateKey, string> = {
  custom: "Tanpa Template",
  invitation: "Surat Undangan",
  notice: "Surat Pemberitahuan",
  recommendation: "Surat Rekomendasi",
  assignment: "Surat Tugas",
  reply: "Surat Balasan",
};

const templates: Record<Locale, Record<Exclude<OutgoingTemplateKey, "custom">, string>> = {
  id: {
    invitation: "Dengan hormat,\n\nSehubungan dengan [KEGIATAN], kami mengundang [PENERIMA] untuk hadir pada:\n\nHari/Tanggal: [TANGGAL]\nWaktu: [WAKTU]\nTempat: [TEMPAT]\n\nDemikian undangan ini disampaikan. Atas kehadirannya kami ucapkan terima kasih.",
    notice: "Dengan hormat,\n\nMelalui surat ini kami memberitahukan bahwa [ISI PEMBERITAHUAN].\n\nDemikian pemberitahuan ini disampaikan untuk diketahui dan ditindaklanjuti sebagaimana mestinya.",
    recommendation: "Dengan hormat,\n\nBerdasarkan permohonan dan hasil pemeriksaan administrasi, kami memberikan rekomendasi kepada [NAMA/INSTANSI] untuk [KEPERLUAN].\n\nSurat rekomendasi ini dibuat untuk digunakan sebagaimana mestinya.",
    assignment: "Yang bertanda tangan di bawah ini memberikan tugas kepada:\n\nNama: [NAMA PETUGAS]\nJabatan: [JABATAN]\nTugas: [URAIAN TUGAS]\nTempat/Tanggal: [TEMPAT DAN TANGGAL]\n\nTugas ini agar dilaksanakan dengan penuh tanggung jawab.",
    reply: "Dengan hormat,\n\nMenindaklanjuti surat [NOMOR SURAT ASAL] perihal [PERIHAL], bersama ini kami menyampaikan bahwa [ISI JAWABAN].\n\nDemikian jawaban ini disampaikan. Atas perhatian dan kerja samanya kami ucapkan terima kasih.",
  },
  tet: {
    invitation: "Ho respeitu,\n\nLigadu ho [ATIVIDADE], ami konvida [SIMU-NA'IN] atu partisipa iha:\n\nLoron/Data: [DATA]\nOras: [ORAS]\nFatin: [FATIN]\n\nAmi hato'o konvite ida-ne'e no agradese ba ita-nia prezensa.",
    notice: "Ho respeitu,\n\nLiu husi karta ida-ne'e ami informa katak [KONTEÚDU INFORMASAUN].\n\nInformasaun ida-ne'e hato'o atu hatene no halo tuir nesesidade.",
    recommendation: "Ho respeitu,\n\nBazeia ba pedidu no verifikasaun administrativa, ami fó rekomendasaun ba [NARAN/INSTITUISAUN] atu [NESESIDADE].\n\nKarta rekomendasaun ida-ne'e halo atu uza tuir ninia finalidade.",
    assignment: "Ema ne'ebé asina iha kraik fó tarefa ba:\n\nNaran: [NARAN FUNSIONÁRIU]\nKargu: [KARGU]\nTarefa: [DESKRISAUN TAREFA]\nFatin/Data: [FATIN NO DATA]\n\nTarefa ida-ne'e tenke hala'o ho responsabilidade.",
    reply: "Ho respeitu,\n\nAtu responde ba karta [NÚMERU KARTA ORIJINÁL] kona-ba [ASUNTU], ami hato'o katak [KONTEÚDU RESPOSTA].\n\nAmi hato'o resposta ida-ne'e no agradese ba atensaun no kooperasaun.",
  },
  pt: {
    invitation: "Exmo.(a) Senhor(a),\n\nNo âmbito de [ATIVIDADE], convidamos [DESTINATÁRIO] a participar em:\n\nDia/Data: [DATA]\nHora: [HORA]\nLocal: [LOCAL]\n\nAgradecemos antecipadamente a sua presença.",
    notice: "Exmo.(a) Senhor(a),\n\nPela presente informamos que [CONTEÚDO DO AVISO].\n\nEsta comunicação é apresentada para conhecimento e seguimento adequado.",
    recommendation: "Exmo.(a) Senhor(a),\n\nCom base no pedido e na verificação administrativa, recomendamos [NOME/INSTITUIÇÃO] para [FINALIDADE].\n\nA presente recomendação destina-se aos devidos efeitos.",
    assignment: "O signatário designa para a seguinte missão:\n\nNome: [NOME DO FUNCIONÁRIO]\nCargo: [CARGO]\nMissão: [DESCRIÇÃO]\nLocal/Data: [LOCAL E DATA]\n\nA missão deverá ser cumprida com responsabilidade.",
    reply: "Exmo.(a) Senhor(a),\n\nEm resposta à carta [NÚMERO DA CARTA ORIGINAL] sobre [ASSUNTO], comunicamos que [CONTEÚDO DA RESPOSTA].\n\nAgradecemos a atenção e a colaboração.",
  },
};

export function outgoingTemplateContent(key: OutgoingTemplateKey, locale: Locale) {
  return key === "custom" ? "" : templates[locale][key];
}
