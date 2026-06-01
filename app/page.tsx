"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"

type MediaItem = {
  id: string
  filename: string
  storage_path: string
  media_type: string
}

export default function Home() {
  const eventTitle = "Katy's Birthday Album"

  const [files, setFiles] = useState<MediaItem[]>([])
  const [uploading, setUploading] = useState(false)

  async function loadFiles() {
    const { data, error } = await supabase
      .from("media")
      .select("*")
      .order("created_at", { ascending: false })

    if (error) {
      console.error(error)
      return
    }

    setFiles(data || [])
  }

  useEffect(() => {
    loadFiles()
  }, [])

async function uploadFiles(e: React.ChangeEvent<HTMLInputElement>) {
  const selected = e.target.files
  if (!selected) return

  setUploading(true)

  const filesArray = Array.from(selected)

  for (const file of filesArray) {
    const fileId = crypto.randomUUID()
    const fileName = `${fileId}-${file.name}`

    try {
      // 1. Upload to storage
      const { error: uploadError } = await supabase.storage
        .from("uploads")
        .upload(fileName, file)

      if (uploadError) {
        console.error("Upload error:", uploadError)
        continue
      }

      // 2. Save metadata
      const { error: dbError } = await supabase
        .from("media")
        .insert({
          filename: file.name,
          storage_path: fileName,
          media_type: file.type
        })

      if (dbError) {
        console.error("DB error:", dbError)
      }

    } catch (err) {
      console.error("Unexpected error:", err)
    }
  }

  await loadFiles()
  setUploading(false)
  e.target.value = ""
}

  return (
    <main
      style={{
        maxWidth: "1200px",
        margin: "0 auto",
        padding: "20px"
      }}
    >
      <div style={{ marginBottom: "30px" }}>
        <h1
          style={{
            fontSize: "34px",
            fontWeight: 700,
            marginBottom: "10px"
          }}
        >
          {eventTitle}
        </h1>

        <p
          style={{
            color: "#666",
            fontSize: "18px"
          }}
        >
          Share your photos and videos from the day ✨
        </p>
      </div>

      <div style={{ marginBottom: "20px" }}>
        <label
          style={{
            display: "inline-block",
            padding: "14px 20px",
            background: "#111",
            color: "#fff",
            borderRadius: "10px",
            cursor: "pointer",
            fontWeight: 600
          }}
        >
          Upload Photos & Videos

          <input
            type="file"
            accept="image/*,video/*"
            multiple
            onChange={uploadFiles}
            disabled={uploading}
            style={{ display: "none" }}
          />
        </label>
      </div>

      {uploading && (
        <p style={{ marginBottom: "20px" }}>
          Uploading...
        </p>
      )}

      <h2
        style={{
          marginBottom: "15px"
        }}
      >
        Latest Memories
      </h2>

      <div
        style={{
          display: "grid",
          gridTemplateColumns:
            "repeat(auto-fill, minmax(160px, 1fr))",
          gap: "10px"
        }}
      >
        {files.map((f) => {
          const url = supabase.storage
            .from("uploads")
            .getPublicUrl(f.storage_path).data.publicUrl

          return (
            <div key={f.id}>
              {f.media_type.startsWith("video") ? (
                <video
                  src={url}
                  controls
                  style={{
                    width: "100%",
                    borderRadius: "10px"
                  }}
                />
              ) : (
                <img
                  src={url}
                  alt={f.filename}
                  style={{
                    width: "100%",
                    borderRadius: "10px",
                    display: "block"
                  }}
                />
              )}
            </div>
          )
        })}
      </div>
    </main>
  )
}
