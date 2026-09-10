import api from './axios';

export const getKPIs = async (params = {}) => {
  const res = await api.get('/kpi', { params });
  return res.data;
};

export const getKPISummary = async (params = {}) => {
  const res = await api.get('/kpi/summary', { params });
  return res.data;
};

export const getKPITeammates = async () => {
  const res = await api.get('/kpi/teammates');
  return res.data;
};

export const createOrUpdateKPI = async (data) => {
  const res = await api.post('/kpi', data);
  return res.data;
};

export const updateKPI = async (id, data) => {
  const res = await api.put(`/kpi/${id}`, data);
  return res.data;
};

export const downloadKPICSV = async (params = {}) => {
  const res = await api.get('/kpi/export-csv', {
    params,
    responseType: 'blob',
  });

  const blob = new Blob([res.data], { type: 'text/csv;charset=utf-8;' });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  
  // Extract filename from Content-Disposition if present, else default
  const disposition = res.headers['content-disposition'];
  let filename = `Daily_KPI_Log_${new Date().toISOString().split('T')[0]}.csv`;
  if (disposition && disposition.includes('filename=')) {
    const match = disposition.match(/filename="?([^"]+)"?/);
    if (match && match[1]) filename = match[1];
  }
  
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
};
