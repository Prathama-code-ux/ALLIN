import api from "../api/client";

export const aiService = {
  async parseReceipt({ imageBase64, mimeType, fileName, groupId, onUploadProgress }) {
    const response = await api.post(
      "/ai/parse-receipt",
      {
        imageBase64,
        mimeType,
        fileName,
        ...(groupId ? { groupId } : {}),
      },
      {
        timeout: 45000,
        onUploadProgress,
      },
    );
    return response.data;
  },
};

export default aiService;

