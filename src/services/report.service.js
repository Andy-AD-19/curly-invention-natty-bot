/**
 * Ported logic from script.js for calculating pharmacy metrics
 */

export const calculateTotals = (pages = []) => {
  return pages.reduce((acc, p) => ({
    pageNo: acc.pageNo + 1,
    male: acc.male + (Number(p.male) || 0),
    female: acc.female + (Number(p.female) || 0),
    totalPatients: acc.totalPatients + (Number(p.totalPatients) || 0),
    totalMedications: acc.totalMedications + (Number(p.totalMedications) || 0),
    stockOut: acc.stockOut + (Number(p.stockOut) || 0),
    antibiotics: acc.antibiotics + (Number(p.antibiotics) || 0),
    etb: acc.etb + (Number(p.etb) || 0),
    proff: acc.proff + (Number(p.proff) || 0),
    proffEtb: acc.proffEtb + (Number(p.proffEtb) || 0),
  }), { 
    pageNo: 0, male: 0, female: 0, totalPatients: 0, totalMedications: 0, 
    stockOut: 0, antibiotics: 0, etb: 0, proff: 0, proffEtb: 0 
  });
};

export const generateInsights = (totals, pageCount) => {
  const malePct = totals.totalPatients > 0 ? ((totals.male / totals.totalPatients) * 100).toFixed(1) : 0;
  const femalePct = totals.totalPatients > 0 ? ((totals.female / totals.totalPatients) * 100).toFixed(1) : 0;
  const antiPct = totals.totalMedications > 0 ? ((totals.antibiotics / totals.totalMedications) * 100).toFixed(1) : 0;
  const stockOutRate = totals.totalMedications > 0 ? ((totals.stockOut / totals.totalMedications) * 100).toFixed(1) : 0;
  
  const avgPatients = pageCount > 0 ? (totals.totalPatients / pageCount).toFixed(1) : 0;
  const avgMedsPerPatient = totals.totalPatients > 0 ? (totals.totalMedications / totals.totalPatients).toFixed(1) : 0;
  const totalRevenue = (Number(totals.etb) + Number(totals.proffEtb)).toFixed(2);
  const avgRevPerPt = totals.totalPatients > 0 ? (totalRevenue / totals.totalPatients).toFixed(2) : 0;

  return {
    malePct,
    femalePct,
    antiPct,
    stockOutRate,
    avgPatients,
    avgMedsPerPatient,
    totalRevenue,
    avgRevPerPt
  };
};
