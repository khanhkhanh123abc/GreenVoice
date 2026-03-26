import api from "./axiosInstance";

export const getAllReports = (params) => api.get("/reports", { params });
export const getReportById = (id) => api.get(`/reports/${id}`);
export const createReport = (data) => api.post("/reports", data);
export const approveReport = (id, adminNote) => api.patch(`/reports/${id}/approve`, { adminNote });
export const rejectReport = (id, adminNote) => api.patch(`/reports/${id}/reject`, { adminNote });
export const deleteReport = (id) => api.delete(`/reports/${id}`);