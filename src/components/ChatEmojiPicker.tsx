import React, { useState, useRef, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Search, X, Sparkles } from 'lucide-react';

export interface EmojiItem {
  emoji: string;
  name: string;
  category: 'animals' | 'medical' | 'faces' | 'clinic';
  keywords: string[];
}

const EMOJI_DATABASE: EmojiItem[] = [
  // 🐾 Animals & Pets
  { emoji: '🐶', name: 'Dog Face', category: 'animals', keywords: ['dog', 'puppy', 'pet', 'canine'] },
  { emoji: '🐱', name: 'Cat Face', category: 'animals', keywords: ['cat', 'kitten', 'pet', 'feline'] },
  { emoji: '🐕', name: 'Dog', category: 'animals', keywords: ['dog', 'pet', 'breed'] },
  { emoji: '🐩', name: 'Poodle', category: 'animals', keywords: ['dog', 'grooming', 'poodle'] },
  { emoji: '🐈', name: 'Cat', category: 'animals', keywords: ['cat', 'kitten', 'feline'] },
  { emoji: '🐾', name: 'Paw Prints', category: 'animals', keywords: ['paw', 'pet', 'track', 'animal', 'footprint'] },
  { emoji: '🐰', name: 'Rabbit', category: 'animals', keywords: ['rabbit', 'bunny', 'hare'] },
  { emoji: '🐹', name: 'Hamster', category: 'animals', keywords: ['hamster', 'rodent', 'small animal'] },
  { emoji: '🐴', name: 'Horse', category: 'animals', keywords: ['horse', 'equine', 'stallion', 'mare'] },
  { emoji: '🐮', name: 'Cow Face', category: 'animals', keywords: ['cow', 'bovine', 'dairy', 'cattle'] },
  { emoji: '🐂', name: 'Ox', category: 'animals', keywords: ['ox', 'bull', 'livestock'] },
  { emoji: '🐃', name: 'Water Buffalo', category: 'animals', keywords: ['buffalo', 'dairy', 'livestock'] },
  { emoji: '🐑', name: 'Sheep', category: 'animals', keywords: ['sheep', 'ewe', 'wool', 'livestock'] },
  { emoji: '🐐', name: 'Goat', category: 'animals', keywords: ['goat', 'caprine', 'livestock'] },
  { emoji: '🐔', name: 'Chicken', category: 'animals', keywords: ['chicken', 'hen', 'poultry', 'bird'] },
  { emoji: '🦆', name: 'Duck', category: 'animals', keywords: ['duck', 'poultry', 'waterfowl'] },
  { emoji: '🦜', name: 'Parrot', category: 'animals', keywords: ['parrot', 'bird', 'avian', 'exotic'] },
  { emoji: '🐦', name: 'Bird', category: 'animals', keywords: ['bird', 'avian', 'pet'] },
  { emoji: '🐢', name: 'Turtle', category: 'animals', keywords: ['turtle', 'tortoise', 'reptile'] },
  { emoji: '🐟', name: 'Fish', category: 'animals', keywords: ['fish', 'aquarium', 'aquatic'] },
  { emoji: '🦴', name: 'Bone', category: 'animals', keywords: ['bone', 'treat', 'dog food', 'chew'] },
  { emoji: '🥩', name: 'Cut of Meat', category: 'animals', keywords: ['meat', 'food', 'diet', 'nutrition'] },

  // 🩺 Veterinary & Health
  { emoji: '🩺', name: 'Stethoscope', category: 'medical', keywords: ['stethoscope', 'doctor', 'examination', 'vet', 'checkup'] },
  { emoji: '💊', name: 'Pill', category: 'medical', keywords: ['pill', 'medicine', 'drug', 'treatment', 'prescription'] },
  { emoji: '🩹', name: 'Bandage', category: 'medical', keywords: ['bandage', 'wound', 'injury', 'dressing', 'first aid'] },
  { emoji: '💉', name: 'Syringe', category: 'medical', keywords: ['syringe', 'vaccine', 'injection', 'immunization', 'shot'] },
  { emoji: '🏥', name: 'Hospital', category: 'medical', keywords: ['hospital', 'clinic', 'emergency', 'care'] },
  { emoji: '🌡️', name: 'Thermometer', category: 'medical', keywords: ['thermometer', 'fever', 'temperature', 'sick'] },
  { emoji: '🩻', name: 'X-Ray', category: 'medical', keywords: ['xray', 'bone', 'radiology', 'scan'] },
  { emoji: '🦷', name: 'Tooth', category: 'medical', keywords: ['tooth', 'dental', 'teeth', 'scaling'] },
  { emoji: '📋', name: 'Clipboard', category: 'medical', keywords: ['clipboard', 'record', 'prescription', 'chart', 'notes'] },
  { emoji: '🚑', name: 'Ambulance', category: 'medical', keywords: ['ambulance', 'emergency', 'urgent', 'transport'] },
  { emoji: '🔬', name: 'Microscope', category: 'medical', keywords: ['microscope', 'lab', 'blood test', 'pathology'] },
  { emoji: '🧪', name: 'Test Tube', category: 'medical', keywords: ['test tube', 'sample', 'chemistry', 'diagnostic'] },
  { emoji: '🧴', name: 'Lotion Bottle', category: 'medical', keywords: ['lotion', 'shampoo', 'ointment', 'topical'] },
  { emoji: '🧼', name: 'Soap', category: 'medical', keywords: ['soap', 'clean', 'sanitize', 'hygiene'] },
  { emoji: '❤️‍🩹', name: 'Mending Heart', category: 'medical', keywords: ['healing', 'recovery', 'cure', 'wellness'] },
  { emoji: '⚠️', name: 'Warning', category: 'medical', keywords: ['warning', 'alert', 'caution', 'danger', 'symptom'] },
  { emoji: '🚨', name: 'Emergency Light', category: 'medical', keywords: ['emergency', 'urgent', 'critical', 'danger'] },
  { emoji: '🛡️', name: 'Shield', category: 'medical', keywords: ['shield', 'protection', 'prevention', 'immune'] },

  // 😊 Faces, Expressions & Gestures
  { emoji: '😊', name: 'Smiling Face', category: 'faces', keywords: ['smile', 'happy', 'pleased', 'friendly'] },
  { emoji: '😃', name: 'Grinning Face', category: 'faces', keywords: ['grin', 'happy', 'glad'] },
  { emoji: '🥰', name: 'Smiling Face with Hearts', category: 'faces', keywords: ['love', 'care', 'sweet', 'cute'] },
  { emoji: '🧐', name: 'Monocle Face', category: 'faces', keywords: ['examining', 'curious', 'inspecting', 'check'] },
  { emoji: '🥺', name: 'Pleading Face', category: 'faces', keywords: ['please', 'worried', 'puppy eyes', 'sad'] },
  { emoji: '😌', name: 'Relieved Face', category: 'faces', keywords: ['relieved', 'safe', 'calm', 'fine'] },
  { emoji: '👍', name: 'Thumbs Up', category: 'faces', keywords: ['thumbs up', 'good', 'approved', 'yes', 'ok'] },
  { emoji: '👎', name: 'Thumbs Down', category: 'faces', keywords: ['thumbs down', 'no', 'disagree'] },
  { emoji: '🙏', name: 'Folded Hands', category: 'faces', keywords: ['thank you', 'thanks', 'please', 'gratitude'] },
  { emoji: '👏', name: 'Clapping Hands', category: 'faces', keywords: ['bravo', 'applause', 'great', 'success'] },
  { emoji: '🤝', name: 'Handshake', category: 'faces', keywords: ['handshake', 'deal', 'agreement', 'consultation'] },
  { emoji: '❤️', name: 'Red Heart', category: 'faces', keywords: ['heart', 'love', 'care', 'affection'] },
  { emoji: '💚', name: 'Green Heart', category: 'faces', keywords: ['green heart', 'health', 'nature', 'care'] },
  { emoji: '✨', name: 'Sparkles', category: 'faces', keywords: ['sparkles', 'clean', 'new', 'star'] },
  { emoji: '💯', name: 'Hundred Points', category: 'faces', keywords: ['hundred', 'perfect', '100', 'excellent'] },

  // 🏠 Clinic, Visit & Coordination
  { emoji: '🏠', name: 'House', category: 'clinic', keywords: ['home', 'doorstep', 'house call', 'visit'] },
  { emoji: '🚗', name: 'Car', category: 'clinic', keywords: ['car', 'driving', 'on the way', 'mobile visit'] },
  { emoji: '⏰', name: 'Alarm Clock', category: 'clinic', keywords: ['clock', 'time', 'appointment', 'schedule'] },
  { emoji: '📅', name: 'Calendar', category: 'clinic', keywords: ['calendar', 'date', 'booking', 'schedule'] },
  { emoji: '📍', name: 'Pushpin', category: 'clinic', keywords: ['location', 'address', 'pin', 'map'] },
  { emoji: '📞', name: 'Telephone', category: 'clinic', keywords: ['phone', 'call', 'contact'] },
  { emoji: '💬', name: 'Speech Balloon', category: 'clinic', keywords: ['chat', 'message', 'conversation'] },
  { emoji: '🔔', name: 'Bell', category: 'clinic', keywords: ['bell', 'reminder', 'notification'] },
  { emoji: '⭐', name: 'Star', category: 'clinic', keywords: ['star', 'rating', 'top', 'favorite'] },
  { emoji: '💼', name: 'Briefcase', category: 'clinic', keywords: ['briefcase', 'professional', 'work', 'job'] },
  { emoji: '🌿', name: 'Herb', category: 'clinic', keywords: ['herb', 'natural', 'plant', 'organic', 'farm'] },
  { emoji: '🌾', name: 'Ear of Rice', category: 'clinic', keywords: ['farm', 'agriculture', 'feed', 'pasture'] }
];

interface ChatEmojiPickerProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectEmoji: (emoji: string) => void;
}

export const ChatEmojiPicker: React.FC<ChatEmojiPickerProps> = ({
  isOpen,
  onClose,
  onSelectEmoji
}) => {
  const [activeCategory, setActiveCategory] = useState<'all' | 'animals' | 'medical' | 'faces' | 'clinic'>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const pickerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Close on outside click
  useEffect(() => {
    if (!isOpen) return;

    const handlePointerDown = (e: MouseEvent | TouchEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);

    // Focus search on open
    setTimeout(() => {
      searchInputRef.current?.focus();
    }, 100);

    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  const filteredEmojis = useMemo(() => {
    let list = EMOJI_DATABASE;
    if (activeCategory !== 'all') {
      list = list.filter(e => e.category === activeCategory);
    }
    const q = searchQuery.trim().toLowerCase();
    if (!q) return list;

    return list.filter(e => 
      e.name.toLowerCase().includes(q) ||
      e.keywords.some(k => k.toLowerCase().includes(q))
    );
  }, [activeCategory, searchQuery]);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        ref={pickerRef}
        initial={{ opacity: 0, y: 10, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 8, scale: 0.95 }}
        transition={{ duration: 0.16, ease: 'easeOut' }}
        className="absolute bottom-full left-2 sm:left-4 mb-3 z-50 w-72 sm:w-80 bg-white rounded-2xl shadow-2xl border border-[#e3dec9] overflow-hidden flex flex-col max-h-[360px]"
      >
        {/* Header with Search & Close */}
        <div className="p-2.5 bg-[#fdfbf7] border-b border-[#e3dec9] space-y-2 shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-xs font-black text-[#5a5a40]">
              <Sparkles className="w-3.5 h-3.5 text-amber-600" />
              <span>Veterinary Emojis</span>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="text-[#a49f92] hover:text-[#3c3c3b] p-1 rounded-lg hover:bg-stone-200/50 transition-colors cursor-pointer"
              title="Close emoji picker"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Search bar */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-[#a49f92]" />
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search dog, vaccine, heart..."
              className="w-full bg-white border border-[#e3dec9] rounded-xl pl-8 pr-7 py-1.5 text-xs text-[#3c3c3b] outline-none focus:border-[#5a5a40] placeholder:text-[#a49f92]"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 cursor-pointer"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          {/* Category Tabs */}
          <div className="flex items-center gap-1 overflow-x-auto pb-0.5 no-scrollbar">
            <button
              type="button"
              onClick={() => setActiveCategory('all')}
              className={`px-2 py-1 rounded-lg text-[10.5px] font-bold shrink-0 transition-colors cursor-pointer ${
                activeCategory === 'all'
                  ? 'bg-[#5a5a40] text-white shadow-xs'
                  : 'bg-white text-[#7a766f] border border-[#e3dec9] hover:bg-stone-50'
              }`}
            >
              All
            </button>
            <button
              type="button"
              onClick={() => setActiveCategory('animals')}
              className={`px-2 py-1 rounded-lg text-[10.5px] font-bold shrink-0 transition-colors cursor-pointer flex items-center gap-1 ${
                activeCategory === 'animals'
                  ? 'bg-[#5a5a40] text-white shadow-xs'
                  : 'bg-white text-[#7a766f] border border-[#e3dec9] hover:bg-stone-50'
              }`}
            >
              <span>🐾</span> Pets
            </button>
            <button
              type="button"
              onClick={() => setActiveCategory('medical')}
              className={`px-2 py-1 rounded-lg text-[10.5px] font-bold shrink-0 transition-colors cursor-pointer flex items-center gap-1 ${
                activeCategory === 'medical'
                  ? 'bg-[#5a5a40] text-white shadow-xs'
                  : 'bg-white text-[#7a766f] border border-[#e3dec9] hover:bg-stone-50'
              }`}
            >
              <span>🩺</span> Health
            </button>
            <button
              type="button"
              onClick={() => setActiveCategory('faces')}
              className={`px-2 py-1 rounded-lg text-[10.5px] font-bold shrink-0 transition-colors cursor-pointer flex items-center gap-1 ${
                activeCategory === 'faces'
                  ? 'bg-[#5a5a40] text-white shadow-xs'
                  : 'bg-white text-[#7a766f] border border-[#e3dec9] hover:bg-stone-50'
              }`}
            >
              <span>😊</span> Faces
            </button>
            <button
              type="button"
              onClick={() => setActiveCategory('clinic')}
              className={`px-2 py-1 rounded-lg text-[10.5px] font-bold shrink-0 transition-colors cursor-pointer flex items-center gap-1 ${
                activeCategory === 'clinic'
                  ? 'bg-[#5a5a40] text-white shadow-xs'
                  : 'bg-white text-[#7a766f] border border-[#e3dec9] hover:bg-stone-50'
              }`}
            >
              <span>🏠</span> Visits
            </button>
          </div>
        </div>

        {/* Emojis Grid */}
        <div className="p-2.5 overflow-y-auto flex-1 max-h-52 bg-white">
          {filteredEmojis.length === 0 ? (
            <div className="text-center py-6 text-xs text-[#a49f92]">
              No emojis matching &ldquo;{searchQuery}&rdquo;
            </div>
          ) : (
            <div className="grid grid-cols-6 sm:grid-cols-7 gap-1">
              {filteredEmojis.map((item, idx) => (
                <button
                  key={`${item.emoji}-${idx}`}
                  type="button"
                  onClick={() => {
                    onSelectEmoji(item.emoji);
                  }}
                  title={`${item.name} (${item.keywords.slice(0, 3).join(', ')})`}
                  className="w-9 h-9 rounded-xl flex items-center justify-center text-xl hover:bg-amber-100/50 hover:scale-115 active:scale-95 transition-all cursor-pointer select-none"
                >
                  {item.emoji}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Footer tip */}
        <div className="px-3 py-1.5 bg-[#fdfbf7] border-t border-[#e3dec9] text-[9.5px] text-[#a49f92] flex items-center justify-between">
          <span>Tap to insert emoji</span>
          <span className="font-mono text-[9px] uppercase">VetAxis Chat</span>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};
