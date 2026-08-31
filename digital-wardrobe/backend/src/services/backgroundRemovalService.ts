import axios from 'axios';
import FormData from 'form-data';

/**
 * =========================================================================
 * Background Removal Service
 * =========================================================================
 *
 * Current Provider: remove.bg
 *
 * --- HOW TO SWAP PROVIDERS ---
 *
 * 1. To swap to Photoroom API:
 *    - Endpoint: POST https://sdk.photoroom.com/v1/segment
 *    - Header: { 'x-api-key': process.env.PHOTOROOM_API_KEY }
 *    - Form-data: append 'image_file', imageBuffer, { filename: 'image.jpg' }
 *    - Response: ArrayBuffer / binary image buffer
 *
 * 2. To swap to Clipdrop API:
 *    - Endpoint: POST https://clipdrop-api.co/remove-background/v1
 *    - Header: { 'x-api-key': process.env.CLIPDROP_API_KEY }
 *    - Form-data: append 'image_file', imageBuffer, { filename: 'image.jpg' }
 *    - Response: ArrayBuffer / binary PNG buffer
 * =========================================================================
 */

export async function removeBackground(imageBuffer: Buffer): Promise<Buffer> {
  const apiKey = process.env.REMOVE_BG_API_KEY;

  if (apiKey) {
    try {
      const formData = new FormData();
      formData.append('image_file', imageBuffer, { filename: 'garment.jpg' });
      formData.append('size', 'auto');
      formData.append('format', 'png');

      const response = await axios.post('https://api.remove.bg/v1.0/removebg', formData, {
        headers: {
          ...formData.getHeaders(),
          'X-Api-Key': apiKey,
        },
        responseType: 'arraybuffer',
        timeout: 30000,
      });

      return Buffer.from(response.data);
    } catch (error: any) {
      console.error('remove.bg API error:', error?.response?.data?.toString() || error.message);
      // Fall through to mock/passthrough if API fails during dev
    }
  } else {
    console.info(
      'REMOVE_BG_API_KEY not configured. Running mock background removal for local development.'
    );
  }

  // Fallback/Mock mode for development without external API keys:
  // Simulates processing latency (e.g. 1.5s) and returns image buffer
  await new Promise((resolve) => setTimeout(resolve, 1500));
  return imageBuffer;
}
