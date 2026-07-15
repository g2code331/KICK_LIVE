import React, { useState } from 'react';
import { X, Trophy, MapPin, User, Upload, Shield, Globe } from 'lucide-react';
import { supabase } from '../../../lib/supabase';

interface TeamAdderProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function TeamAdder({ isOpen, onClose }: TeamAdderProps) {
  const [primaryColor, setPrimaryColor] = useState('#39FF14');
  const [secondaryColor, setSecondaryColor] = useState('#000000');
  const [isRegistering, setIsRegistering] = useState(false);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    short_name: '',
    city: '',
    venue: '',
    coach: ''
  });

  if (!isOpen) return null;

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setLogoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRegister = async () => {
    if (!formData.name || !formData.short_name) {
      alert('Please fill in club name and code');
      return;
    }

    setIsRegistering(true);
    try {
      const { error } = await supabase
        .from('teams')
        .insert([{
          name: formData.name,
          short_name: formData.short_name.toUpperCase(),
          city: formData.city || 'TBD',
          venue: formData.venue || 'TBD',
          coach: formData.coach || 'TBD',
          primary_color: primaryColor,
          secondary_color: secondaryColor,
          logo_url: logoPreview || null
        }]);

      if (error) throw error;

      alert('Club registered successfully!');
      onClose();
      window.location.reload();
    } catch (err: any) {
      console.error(err);
      alert('Error: ' + (err.message || 'Could not register club.'));
    } finally {
      setIsRegistering(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-brand-bg/95 backdrop-blur-xl" onClick={onClose}></div>
      <div className="relative w-full max-w-5xl glass rounded-[3rem] border border-white/10 shadow-2xl overflow-hidden flex flex-col h-[85vh] animate-in fade-in slide-in-from-bottom-4 duration-500">
        
        {/* Header */}
        <div className="px-10 py-8 border-b border-white/10 flex items-center justify-between bg-white/5">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 gradient-green rounded-2xl flex items-center justify-center shadow-lg shadow-brand-green/20">
              <Shield className="text-black" size={28} />
            </div>
            <div>
              <h2 className="text-2xl font-black italic uppercase tracking-tighter">Club Registration</h2>
              <p className="text-xs text-white/40 uppercase tracking-widest font-bold">Add New Professional Team</p>
            </div>
          </div>
          <button onClick={onClose} className="p-3 hover:bg-white/10 rounded-full transition-colors">
            <X size={24} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto no-scrollbar p-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
            
            {/* Logo Upload & Preview */}
               <div className="lg:col-span-4 space-y-8">
               <div className="relative">
                  <input 
                    type="file" 
                    id="team-logo-input" 
                    className="hidden" 
                    accept="image/*"
                    onChange={handleLogoUpload}
                  />
                  <button 
                    type="button"
                    onClick={() => document.getElementById('team-logo-input')?.click()}
                    className="w-full aspect-square rounded-[3rem] bg-white/5 border-2 border-dashed border-white/10 flex flex-col items-center justify-center gap-4 group cursor-pointer hover:border-brand-green/50 transition-all relative overflow-hidden"
                  >
                    {logoPreview ? (
                      <div className="w-full h-full relative group">
                        <img src={logoPreview} alt="Preview" className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                           <Upload className="text-white" />
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="w-20 h-20 rounded-full bg-white/5 flex items-center justify-center group-hover:scale-110 transition-transform">
                           <Upload size={32} className="text-white/20 group-hover:text-brand-green" />
                        </div>
                        <div className="text-center">
                           <p className="text-xs font-black uppercase tracking-widest text-white/40">Upload Crest</p>
                           <p className="text-[10px] text-white/20">SVG, PNG (Transparent)</p>
                        </div>
                      </>
                    )}
                  </button>
               </div>

               <div className="p-8 rounded-[2.5rem] bg-white/5 border border-white/10 space-y-6">
                  <h4 className="text-[10px] font-black uppercase tracking-widest text-brand-green">Club Colors</h4>
                  <div className="space-y-4">
                     <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold text-white/60">Primary</span>
                        <input type="color" value={primaryColor} onChange={(e) => setPrimaryColor(e.target.value)} className="w-10 h-10 rounded-lg bg-transparent border-none cursor-pointer" />
                     </div>
                     <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold text-white/60">Secondary</span>
                        <input type="color" value={secondaryColor} onChange={(e) => setSecondaryColor(e.target.value)} className="w-10 h-10 rounded-lg bg-transparent border-none cursor-pointer" />
                     </div>
                  </div>
               </div>
            </div>

            {/* Registration Form */}
            <div className="lg:col-span-8 space-y-8">
               <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                     <label className="text-[10px] font-black uppercase tracking-widest text-white/40">Club Full Name</label>
                     <div className="relative">
                        <Shield className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20" size={18} />
                        <input 
                          type="text" 
                          value={formData.name}
                          onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                          placeholder="e.g. Kumasi United FC" 
                          className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-12 pr-4 focus:outline-none focus:border-brand-green/50" 
                        />
                     </div>
                  </div>
                  <div className="space-y-2">
                     <label className="text-[10px] font-black uppercase tracking-widest text-white/40">Short Name / Code</label>
                     <input 
                       type="text" 
                       value={formData.short_name}
                       onChange={(e) => setFormData(prev => ({ ...prev, short_name: e.target.value }))}
                       placeholder="e.g. KUM" 
                       className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 focus:outline-none focus:border-brand-green/50 uppercase font-black italic" 
                     />
                  </div>
               </div>

               <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                     <label className="text-[10px] font-black uppercase tracking-widest text-white/40">Home Stadium</label>
                     <div className="relative">
                        <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20" size={18} />
                        <input 
                          type="text" 
                          value={formData.venue}
                          onChange={(e) => setFormData(prev => ({ ...prev, venue: e.target.value }))}
                          placeholder="e.g. Baba Yara Stadium" 
                          className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-12 pr-4 focus:outline-none focus:border-brand-green/50" 
                        />
                     </div>
                  </div>
                  <div className="space-y-2">
                     <label className="text-[10px] font-black uppercase tracking-widest text-white/40">City / Region</label>
                     <input 
                       type="text" 
                       value={formData.city}
                       onChange={(e) => setFormData(prev => ({ ...prev, city: e.target.value }))}
                       placeholder="e.g. Kumasi" 
                       className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 focus:outline-none focus:border-brand-green/50" 
                     />
                  </div>
               </div>

               <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                     <label className="text-[10px] font-black uppercase tracking-widest text-white/40">Head Coach</label>
                     <div className="relative">
                        <User className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20" size={18} />
                        <input 
                          type="text" 
                          value={formData.coach}
                          onChange={(e) => setFormData(prev => ({ ...prev, coach: e.target.value }))}
                          placeholder="Manager Name" 
                          className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-12 pr-4 focus:outline-none focus:border-brand-green/50" 
                        />
                     </div>
                  </div>
                  <div className="space-y-2">
                     <label className="text-[10px] font-black uppercase tracking-widest text-white/40">Competition</label>
                     <div className="relative">
                        <Trophy className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20" size={18} />
                        <select className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-12 pr-4 focus:outline-none focus:border-brand-green/50 appearance-none font-bold">
                           <option>Rx Premier League</option>
                           <option>Rx Cup</option>
                           <option>Gala Invitational</option>
                        </select>
                     </div>
                  </div>
               </div>

               <div className="p-8 rounded-[2.5rem] bg-brand-green/5 border border-brand-green/10 flex items-start gap-4">
                  <Globe size={24} className="text-brand-green shrink-0 mt-1" />
                  <div>
                     <h4 className="text-sm font-black uppercase italic tracking-tight text-brand-green">Professional Validation</h4>
                     <p className="text-xs text-white/40 leading-relaxed mt-1">Registering this team will create an official club entry in the KickLive database. You will be able to add players and managers to this club once registration is complete.</p>
                  </div>
               </div>
            </div>

          </div>
        </div>

        {/* Footer */}
        <div className="px-10 py-8 bg-white/5 border-t border-white/10 flex items-center justify-end gap-4">
           <button onClick={onClose} className="px-8 py-3 rounded-xl font-bold text-sm text-white/40 hover:text-white transition-colors">Discard</button>
           <button 
             onClick={handleRegister}
             disabled={isRegistering}
             className="px-12 py-4 rounded-xl gradient-green text-black font-black uppercase tracking-widest text-sm shadow-xl shadow-brand-green/20 hover:scale-105 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
           >
              {isRegistering ? (
                <>
                  <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin"></div>
                  Registering...
                </>
              ) : 'Register Club'}
           </button>
        </div>

      </div>
    </div>
  );
}
