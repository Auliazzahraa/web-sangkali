export const uploadToCloudinary = async (file) => {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("upload_preset", "upload_open"); // pakai nama preset baru

  const fileType = file.type;
  const isDoc = [
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  ].includes(fileType);

  const resourceType = isDoc ? "raw" : "image";

  const endpoint = `https://api.cloudinary.com/v1_1/dmdfgqk2h/${resourceType}/upload`;

  try {
    const res = await fetch(endpoint, {
      method: "POST",
      body: formData,
    });

    const data = await res.json();
    return data.secure_url;
  } catch (error) {
    console.error("❌ Error saat upload ke Cloudinary:", error);
    return null;
  }
};
