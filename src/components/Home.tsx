import { useNavigate } from 'react-router-dom';
import { supabase } from '../services/supabaseClient';
import { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import type { RootState } from '../app/store';

type Blog = {
  id: string
  title: string
  content: string
  user_id: string
  image_url: string | null
  created_at: string
  profiles: { username: string | null }[] | { username: string | null } | null
}

type Comment = {
  id: string
  blog_id: string
  user_id: string
  comment: string
  image_url: string | null
  created_at: string
}

export const uploadImage = async (file: File, folder: string) => {
  const fileExt = file.name.split('.').pop()
  const fileName = `${crypto.randomUUID()}.${fileExt}`
  const filePath = `${folder}/${fileName}`

  const { error } = await supabase.storage
    .from('blog-images')
    .upload(filePath, file, {
      upsert: false,
      contentType: file.type
    })

  if (error) throw error

  const { data } = supabase
    .storage
    .from('blog-images')
    .getPublicUrl(filePath)

  return data.publicUrl
}

const Home = () => {
  const user = useSelector((state: RootState) => state.auth.user)
  const navigate = useNavigate()

  const [blogs, setBlogs] = useState<Blog[]>([])
  const [selectedBlog, setSelectedBlog] = useState<Blog | null>(null)
  const [loading, setLoading] = useState(false)

  {/* Create Blog */}
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [newContent, setNewContent] = useState('')
  const [createError, setCreateError] = useState<string | null>(null)
  const [newImage, setNewImage] = useState<File | null>(null)

  {/* Edit Blog */}
  const [editingBlog, setEditingBlog] = useState<Blog | null>(null)
  const [editTitle, setEditTitle] = useState('')
  const [editContent, setEditContent] = useState('')
  const [editError, setEditError] = useState<string | null>(null)

  {/* Comments */}
  const [comments, setComments] = useState<Comment[]>([])
  const [commentText, setCommentText] = useState('')
  const [commentImage, setCommentImage] = useState<File | null>(null)
  const [commentError, setCommentError] = useState<string | null>(null)

  {/* Pagination */}
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const pageSize = 8;
  const totalPages = Math.ceil(total / pageSize)

  const fetchBlogs = async () => {
    setLoading(true);

    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    const { data, count, error } = await supabase
      .from('blogs')
      .select(`
        id,
        title,
        content,
        user_id,
        created_at,
        image_url,
        profiles!blogs_user_id_fkey (username)
      `, { count: "exact" })
      .order('created_at', { ascending: false })
      .range(from, to);

    setLoading(false);

    if (error) {
      console.error(error.message);
      return;
    }

    setBlogs(data as Blog[] ?? []);
    setTotal(count ?? 0);
  }

  const handleCreateBlog = async () => {
    if (!newTitle || !newContent) {
      setCreateError('Title and content are required')
      return
    }

    if (!user) {
      setCreateError('You must be logged in')
      return
    }

    let imageUrl = null

    if (newImage) {
      imageUrl = await uploadImage(newImage, 'blogs')

      if (!imageUrl) {
        setCreateError('Image upload failed')
        return
      }
    }

    const { error } = await supabase
      .from('blogs')
      .insert({
        title: newTitle,
        content: newContent,
        user_id: user.id,
        image_url: imageUrl,
      })
      .select(`
        id,
        title,
        content,
        user_id,
        image_url,
        created_at,
        profiles!blogs_user_id_fkey (username)
      `)
      .single()

    if (error) {
      setCreateError(error.message)
      return
    }

    setPage(1)
    await fetchBlogs();

    setNewTitle('')
    setNewContent('')
    setNewImage(null)
    setCreateError(null)
    setShowCreateModal(false)
  }

  const handleEditBlog = async () => {
    if (!editingBlog) return

    if (!editTitle || !editContent) {
      setEditError('Title and content are required')
      return
    }

    const { error } = await supabase
      .from('blogs')
      .update({
        title: editTitle,
        content: editContent
      })
      .eq('id', editingBlog.id)

    if (error) {
      setEditError(error.message)
      return
    }

    setBlogs(prev =>
      prev.map(blog =>
        blog.id === editingBlog.id
          ? { ...blog, title: editTitle, content: editContent }
          : blog
      )
    )

    await fetchBlogs()

    setEditingBlog(null)
    setEditError(null)
  }

  const handleDeleteBlog = async (id: string) => {
    const confirmDelete = window.confirm('Delete this blog?')
    if (!confirmDelete) return

    const { error } = await supabase
      .from('blogs')
      .delete()
      .eq('id', id)

    if (!error) {
      setBlogs(prev => prev.filter(blog => blog.id !== id))
    }
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    navigate('/login')
  }

  const fetchComments = async (blogId: string) => {
    const { data } = await supabase
      .from('comments')
      .select('*')
      .eq('blog_id', blogId)
      .order('created_at', { ascending: true })

    setComments(data ?? [])
  }

  const handleCreateComment = async () => {
    if (!user) {
      setCommentError('You must be logged in');
      return;
    }

    if (!commentText.trim()) {
      setCommentError('Comment is required');
      return;
    }

    let imageUrl = null;
    if (commentImage) {
      try {
        imageUrl = await uploadImage(commentImage, 'comments');
      } catch (err) {
        setCommentError('Image upload failed');
        return;
      }
    }

    const { data, error } = await supabase
      .from('comments')
      .insert({
        blog_id: selectedBlog!.id,
        user_id: user.id,
        comment: commentText,
        image_url: imageUrl
      })
      .select()
      .single();

    if (error) {
      setCommentError(error.message);
      return;
    }

    setComments(prev => [...prev, data]);
    setCommentText('');
    setCommentImage(null);
    setCommentError(null);
  }

  useEffect(() => {
    fetchBlogs()
  }, [page]);

  useEffect(() => {
    if (!selectedBlog) return
    fetchComments(selectedBlog.id)
  }, [selectedBlog])

  if (loading)
  return (
    <div className="fixed inset-0 flex items-center justify-center bg-[#1b1b1b]">
      <div className="w-12 h-12 border-4 border-gray-600 border-t-purple-500 rounded-full animate-spin"></div>
    </div>
  );

  return (
    <>
      <div className={`fixed inset-0 bg-[#1b1b1b] text-white p-6 ${selectedBlog || showCreateModal || editingBlog ? 'blur-sm' : ''}`}>
        <div className="flex justify-between items-center mb-6">
          <h1 className='text-2xl'>Blogs</h1>
          <button
            className='rounded-full px-4 py-2 bg-gradient-to-r from-violet-900 via-purple-700 to-violet-400'
            onClick={handleLogout}
          >
            Logout
          </button>

          <div className='absolute right-5 bottom-5 bg-blue-500 rounded-full px-4 py-2'>
            <button
              onClick={() => setShowCreateModal(true)}
              className='text-white text-xl font-bold'
            >
              +
            </button>
          </div>

          <div className="absolute left-1/2 -translate-x-1/2 bottom-5 flex items-center gap-3">
          
          {/* Previous */}
          <button
            disabled={page === 1}
            onClick={() => setPage(p => p - 1)}
          >
            Prev
          </button>

          {/* Page numbers */}
          {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
            <button
              key={p}
              onClick={() => setPage(p)}
              className={p === page ? "font-bold underline" : ""}
            >
              {p}
            </button>
          ))}

          {/* Next */}
          <button
            disabled={page === totalPages}
            onClick={() => setPage(p => p + 1)}
          >
            Next
          </button>
        </div>
        </div>

        {/* Blog Card */}
        <div className="h-[70vh] overflow-auto">
          <div className='grid grid-cols-1 md:grid-cols-4 gap-4'>
            {blogs.map((blog) => {
              const username = Array.isArray(blog.profiles)
                ? blog.profiles[0]?.username
                : blog.profiles?.username;

              return (
                <div
                  key={blog.id}
                  onClick={() => setSelectedBlog(blog)}
                  className="cursor-pointer rounded-xl bg-[#2a2a2a] p-4 hover:shadow-lg relative"
                >
                  {/* USER HEADER */}
                  <div className="mb-2">
                    <p className="font-semibold text-sm text-white">
                      {username ?? "Unknown user"}
                    </p>
                    <p className="text-xs text-gray-400">
                      {new Date(blog.created_at).toLocaleString()}
                    </p>
                  </div>

                  {/* CONTENT */}
                  <p className="text-sm text-gray-200 whitespace-pre-wrap">
                    {blog.content.slice(0, 150)}
                    {blog.content.length > 150 && "..."}
                  </p>

                  {/* IMAGE */}
                  {blog.image_url && (
                    <img
                      src={blog.image_url}
                      className="w-full max-h-40 object-cover rounded-lg mt-3 bg-black"
                      alt="blog image"
                    />
                  )}

                  {/* ACTIONS */}
                  {blog.user_id === user?.id && (
                    <div className="absolute top-2 right-2 flex gap-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          setEditingBlog(blog)
                          setEditTitle(blog.title)
                          setEditContent(blog.content)
                        }}
                        className="text-xs bg-yellow-500 px-2 py-1 rounded"
                      >
                        Edit
                      </button>

                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          handleDeleteBlog(blog.id)
                        }}
                        className="text-xs bg-red-600 px-2 py-1 rounded"
                      >
                        Delete
                      </button>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {selectedBlog && (
        <div className='fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center'>
          <div className='bg-white text-black max-w-xl w-full p-6 rounded-xl relative max-h-[90vh] overflow-auto'>
            <button
              onClick={() => setSelectedBlog(null)}
              className='absolute top-3 right-3 text-xl'
            >
              ✕
            </button>

            <h2 className='text-2xl font-bold'>{selectedBlog.title}</h2>
            <p className='mt-4'>{selectedBlog.content}</p>

            {selectedBlog.image_url && (
              <img
                src={selectedBlog.image_url}
                className="w-full h-auto max-h-[60vh] object-contain rounded mt-4"
                alt="blog image"
              />
            )}

            {/* Comments */}
            <div className="mt-6">
              <h3 className="font-bold">Comments</h3>

              {comments.map(c => (
                <div key={c.id} className="border p-3 rounded my-2">
                  <p>{c.comment}</p>
                  {c.image_url && (
                    <img
                      src={c.image_url}
                      className="w-full h-auto max-h-[40vh] object-contain rounded mt-2"
                      alt="comment image"
                    />
                  )}
                </div>
              ))}

              <textarea
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                className="w-full border p-2 rounded mt-3"
                placeholder="Write a comment..."
              />

              <div className='flex items-center justify-between mt-2'>
                <input
                  id='comment-image'
                  type="file"
                  accept="image/*"
                  onChange={(e) => setCommentImage(e.target.files?.[0] ?? null)}
                  className="hidden"
                />

                <label
                  htmlFor='comment-image'
                  className='inline-block mt-2 cursor-pointer bg-gray-200 px-3 py-1 rounded hover:bg-gray-300'
                >
                  Choose image
                </label>
                {commentError && (
                  <p className="text-red-600 mt-1">{commentError}</p>
                )}
                <button
                  onClick={handleCreateComment}
                  className="bg-blue-600 text-white px-4 py-2 rounded mt-2"
                >
                  Comment
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center">
          <div className="bg-white text-black max-w-xl w-full p-6 rounded-xl relative">

            <button
              onClick={() => setShowCreateModal(false)}
              className="absolute top-3 right-3 text-xl"
            >
              ✕
            </button>

            <h2 className="text-2xl font-bold mb-4">Create Blog</h2>

            <input
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="Title"
              className="w-full border p-2 mb-3 rounded"
            />

            <textarea
              value={newContent}
              onChange={(e) => setNewContent(e.target.value)}
              placeholder="Content"
              className="w-full border p-2 rounded h-40"
            />

            <div className='flex items-center justify-between mt-2'>
              <input
                id="create-image"
                type="file"
                accept="image/*"
                onChange={(e) => setNewImage(e.target.files?.[0] ?? null)}
                className='hidden'
              />

              <label
                htmlFor='create-image'
                className='inline-block mt-2 cursor-pointer bg-gray-200 px-3 py-1 rounded hover:bg-gray-300'
              >
                Choose Image
              </label>
              
              {createError && (
                <p className="text-red-600 mb-2">{createError}</p>
              )}
              <button
                onClick={handleCreateBlog}
                className="bg-green-600 text-white px-4 py-2 rounded mt-2"
              >
                Create
              </button>
            </div>
          </div>
        </div>
      )}

      {editingBlog && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center">
          <div className="bg-white text-black max-w-xl w-full p-6 rounded-xl relative">

            <button
              onClick={() => setEditingBlog(null)}
              className="absolute top-3 right-3 text-xl"
            >
              ✕
            </button>

            <h2 className="text-2xl font-bold mb-4">Edit Blog</h2>

            <input
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              className="w-full border p-2 mb-3 rounded"
            />

            <textarea
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              className="w-full border p-2 mb-3 rounded h-40"
            />

            {editError && (
              <p className="text-red-600 mb-2">{editError}</p>
            )}

            <button
              onClick={handleEditBlog}
              className="bg-blue-600 text-white px-4 py-2 rounded"
            >
              Save Changes
            </button>
          </div>
        </div>
      )}
    </>
  )
}

export default Home;
