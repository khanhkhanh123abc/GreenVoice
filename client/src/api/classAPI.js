import axiosInstance from "./axiosInstance";

// ── Admin ──
export const getAllClasses = () => axiosInstance.get("/classes");
export const getClassById = (id) => axiosInstance.get(`/classes/${id}`);
export const createClass = (data) => axiosInstance.post("/classes", data);
export const updateClass = (id, data) => axiosInstance.put(`/classes/${id}`, data);
export const deleteClass = (id) => axiosInstance.delete(`/classes/${id}`);
export const addStudentToClass = (classId, studentId) =>
  axiosInstance.post(`/classes/${classId}/students`, { studentId });
export const removeStudentFromClass = (classId, studentId) =>
  axiosInstance.delete(`/classes/${classId}/students/${studentId}`);

// ── Student ──
export const getMyClasses = () => axiosInstance.get("/classes/my-classes");
export const getClassMembers = (classId) =>
  axiosInstance.get(`/classes/${classId}/members`);

// ── Feedback ──
export const submitFeedback = (classId, data) =>
  axiosInstance.post(`/classes/${classId}/feedback`, data);
export const getFeedbackByClass = (classId) =>
  axiosInstance.get(`/classes/${classId}/feedback`);
export const getMyReceivedFeedback = () =>
  axiosInstance.get("/classes/feedback/my-received");
export const getMySubmittedFeedback = () =>
  axiosInstance.get("/classes/feedback/my-submitted");