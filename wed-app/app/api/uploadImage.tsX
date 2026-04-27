import axios from 'axios';
import { API_URL } from '../../utils/api';
export async function uploadImage(uri: string) {
  const formData = new FormData();

  formData.append('files', {
    uri,
    name: `photo_${Date.now()}.jpg`,
    type: 'image/jpeg',
  } as any);

  const res = await axios.post(`${API_URL}/upload`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });

  return res.data[0]; // Strapi returns an array of uploaded files
}
