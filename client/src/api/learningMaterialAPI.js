import api from "./axiosInstance";

// Learning Materials
export const getAllMaterials = (params) => api.get("/learning-materials", { params });
export const getMaterialById = (id) => api.get(`/learning-materials/${id}`);
export const createMaterial = (formData) =>
  api.post("/learning-materials", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
export const updateMaterial = (id, data) => api.put(`/learning-materials/${id}`, data);
export const deleteMaterial = (id) => api.delete(`/learning-materials/${id}`);
export const toggleLikeMaterial = (id) => api.put(`/learning-materials/${id}/like`);
export const addCommentMaterial = (id, data) => api.post(`/learning-materials/${id}/comments`, data);
export const deleteCommentMaterial = (id, commentId) =>
  api.delete(`/learning-materials/${id}/comments/${commentId}`);
export const toggleArchiveMaterial = (id) => api.patch(`/learning-materials/${id}/archive`);