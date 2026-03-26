import api from "./axiosInstance";

export const getUsers = () => {
  return api.get("/users");
};

export const getUserById = (id) => {
  return api.get(`/users/${id}`);
};

export const createUser = (data) => {
  return api.post("/users", data);
};

export const updateUser = (id, data) => {
  return api.put(`/users/${id}`, data);
};

export const deleteUser = (id) => {
  return api.delete(`/users/${id}`);
};