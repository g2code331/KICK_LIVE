import { useState } from 'react';
import { X, Newspaper, Upload, Send, FileText, Eye } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { useAuth } from '../../../contexts/AuthContext';

interface MediaPublisherProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function MediaPublisher({ isOpen, onClose }: MediaPublisherProps) {
  const { user } = useAuth();
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [category, setCategory] = useState('Match Report');
  const [isPublishing, setIsPublishing] = useState(false);
  const [isSavingDraft, setIsSavingDraft] = useState(false);
  const [coverImage, setCoverImage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        alert('Image must be less than 5MB');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setCoverImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handlePublish = async () => {
    if (!title || !content) return alert('Please fill in headline and content');
    
    setIsPublishing(true);
    try {
      // 1. Save news to database
      const { data: newsData, error } = await supabase
        .from('media')
        .insert([{
          title,
          content,
          excerpt: content.substring(0, 100) + '...',
          category,
          image_url: coverImage,
          author_id: user?.id,
          published: true
        }])
        .select()
        .single();

      if (error) throw error;

      // 2. Log Activity
      await supabase.rpc('log_activity', {
        p_action: 'News Published',
        p_entity_type: 'media',
        p_entity_id: newsData.id,
        p_entity_name: title,
        p_destination: '/admin/media',
        p_details: { category }
      });

      alert('Article published successfully!');
      onClose();
      window.location.reload();
    } catch (err: any) {
      console.error(err);
      alert('Publishing failed: ' + err.message);
    } finally {
      setIsPublishing(false);
    }
  };

  const handleSaveDraft = async () => {
    if (!title) return alert('Please enter a title');
    
    setIsSavingDraft(true);
    try {
      await supabase.from('media').insert([{
        title,
        content,
        category,
        image_url: coverImage,
        author_id: user?.id,
        published: false
      }]);
      alert('Draft saved!');
      onClose();
    } catch (err: any) {
      alert('Error saving draft: ' + err.message);
    } finally {
      setIsSavingDraft(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-[#0B0E13]/90 backdrop-blur-xl" onClick={onClose}></div>
      <div className="relative w-full max-w-5xl glass rounded-[3rem] border border-white/10 shadow-2xl overflow-hidden flex flex-col h-[85vh] animate-in fade-in slide-in-from-top-4 duration-500">
        
        {/* Header */}
        <div className="px-10 py-8 border-b border-white/10 flex items-center justify-between bg-white/5">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-purple-500/20 rounded-2xl flex items-center justify-center shadow-lg shadow-purple-500/20">
              <Newspaper className="text-purple-500" size={28} />
            </div>
            <div>
              <h2 className="text-2xl font-black italic uppercase tracking-tighter">News Publisher</h2>
              <p className="text-xs text-white/40 uppercase tracking-widest font-bold">Broadcast Content to Fans</p>
            </div>
          </div>
          <button onClick={onClose} className="p-3 hover:bg-white/10 rounded-full transition-colors">
            <X size={24} />
          </button>
        </div>

        {/* Editor Area */}
        <div className="flex-1 overflow-y-auto p-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
            
            {/* Main Content Form */}
            <div className="lg:col-span-8 space-y-8">
               <div className="space-y-4">
                  <label className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40">Article Headline</label>
                  <input 
                    type="text" 
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g. BREAKING: Kumasi United signs new forward..." 
                    className="w-full bg-white/5 border border-white/10 rounded-2xl p-6 text-2xl font-black italic focus:outline-none focus:border-purple-500/50 transition-all text-white"
                  />
               </div>

               <div className="space-y-4">
                  <div className="flex items-center justify-between">
                     <label className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40">Main Content</label>
                     <div className="flex gap-2">
                        <button className="px-3 py-1 bg-white/5 rounded-md text-[10px] font-bold hover:bg-white/10 transition-colors text-white">B</button>
                        <button className="px-3 py-1 bg-white/5 rounded-md text-[10px] font-bold hover:bg-white/10 transition-colors text-white">I</button>
                     </div>
                  </div>
                  <textarea 
                    rows={12}
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    placeholder="Write your story here..." 
                    className="w-full bg-white/5 border border-white/10 rounded-3xl p-8 text-sm leading-relaxed focus:outline-none focus:border-purple-500/50 transition-all resize-none text-white"
                  />
               </div>
            </div>

            {/* Media & Settings Sidebar */}
            <div className="lg:col-span-4 space-y-8">
               <div className="p-8 rounded-[2.5rem] bg-white/5 border border-white/10 space-y-6">
                   <h4 className="text-[10px] font-black uppercase tracking-widest text-purple-500">Feature Image</h4>
                   <div className="relative w-full aspect-video rounded-2xl border-2 border-dashed overflow-hidden">
                     <input 
                       type="file" 
                       id="cover-photo" 
                       accept="image/*"
                       onChange={handleImageUpload}
                       className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-20"
                     />
                     <div className={`w-full h-full flex flex-col items-center justify-center transition-all ${
                       coverImage ? 'border-purple-500/50 bg-purple-500/10' : 'border-white/10 hover:border-purple-500/30'
                     }`}>
                       {coverImage ? (
                         <>
                           <img src={coverImage} alt="Cover" className="w-full h-full object-cover" />
                           <div className="absolute inset-0 bg-black/50 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center z-10">
                             <Upload size={24} className="text-white" />
                           </div>
                         </>
                       ) : (
                         <>
                           <Upload size={24} className="text-purple-500/50" />
                           <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Choose Cover Photo</span>
                         </>
                       )}
                     </div>
                   </div>
                  <div className="space-y-2">
                     <label className="text-[10px] font-black uppercase tracking-widest text-white/20">Category</label>
                     <div className="grid grid-cols-2 gap-2">
                        {['Match Report', 'Transfer', 'News', 'Highlight'].map(cat => (
                           <button 
                             key={cat}
                             onClick={() => setCategory(cat)}
                             className={`px-3 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${
                               category === cat ? 'bg-purple-500 text-white' : 'bg-white/5 text-white/40 hover:bg-white/10'
                             }`}
                           >
                              {cat}
                           </button>
                        ))}
                     </div>
                  </div>
               </div>

               <div className="p-8 rounded-[2.5rem] bg-purple-500/10 border border-purple-500/20 space-y-4">
                  <div className="flex items-center gap-3">
                     <FileText className="text-purple-500" size={18} />
                     <h4 className="text-[10px] font-black uppercase tracking-widest text-purple-500">Publish Options</h4>
                  </div>
                  <p className="text-[10px] text-white/40 leading-relaxed">
                    Your article will be broadcast to all users and appear on the home page immediately.
                  </p>
               </div>
            </div>

          </div>
        </div>

        {/* Footer */}
        <div className="px-10 py-8 bg-white/5 border-t border-white/10 flex items-center justify-between">
           <div className="flex items-center gap-6">
              <button 
                onClick={handleSaveDraft}
                disabled={isSavingDraft || isPublishing}
                className="flex items-center gap-2 text-[10px] font-black uppercase text-white/40 hover:text-white transition-colors disabled:opacity-50"
              >
                 <FileText size={14} /> {isSavingDraft ? 'Saving...' : 'Save Draft'}
              </button>
               <button 
                 onClick={() => alert('Preview feature coming soon!')}
                 className="flex items-center gap-2 text-[10px] font-black uppercase text-white/40 hover:text-white transition-colors"
               >
                  <Eye size={14} /> Preview
               </button>
           </div>
           <div className="flex gap-4">
              <button onClick={onClose} className="px-8 py-3 rounded-xl font-bold text-sm text-white/40 hover:text-white transition-colors">Cancel</button>
              <button 
                onClick={handlePublish}
                disabled={isPublishing || isSavingDraft || !title || !content}
                className="px-10 py-3 rounded-xl bg-purple-500 text-white font-black uppercase tracking-widest text-sm shadow-xl shadow-purple-500/30 hover:scale-105 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 flex items-center gap-2"
              >
                 {isPublishing ? (
                   <>
                     <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                     Publishing...
                   </>
                 ) : (
                   <>
                     <Send size={18} /> Publish News
                   </>
                 )}
              </button>
           </div>
        </div>

      </div>
    </div>
  );
}
