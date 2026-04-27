import axios from 'axios';
import { API_URL } from './api';

export async function savePhoto(imageUrl: string, albumTitle: string) {
  await axios.post(`${API_URL}/photos/auto-process`, {
    data: {
      image_url: imageUrl,
      face_id: Date.now().toString(),
      title: albumTitle,
    },
  });
}
