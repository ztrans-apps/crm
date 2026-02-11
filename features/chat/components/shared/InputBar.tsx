// Input bar component with emoji, attachments, and quick replies
'use client'

import { useState, useRef, Suspense, lazy } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { 
  Smile, 
  Paperclip, 
  Send, 
  Zap, 
  Plus,
  MapPin,
  FileText,
  Phone,
  MessageSquare,
  Upload,
  Mic,
  Image as ImageIcon,
  Video,
  X
} from 'lucide-react'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { useDropzone } from 'react-dropzone'
import type { MediaAttachment } from '@/lib/types/chat'

// Lazy load LocationMap to avoid SSR issues with Leaflet
const LocationMap = lazy(() => import('./LocationMap').then(mod => ({ default: mod.LocationMap })))

interface InputBarProps {
  value: string
  onChange: (value: string) => void
  onSend: (media?: MediaAttachment) => void
  onQuickReplyClick?: () => void
  onFocus?: () => void
  disabled?: boolean
  sending?: boolean
}

export function InputBar({
  value,
  onChange,
  onSend,
  onQuickReplyClick,
  onFocus,
  disabled = false,
  sending = false,
}: InputBarProps) {
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)
  const [showAttachmentMenu, setShowAttachmentMenu] = useState(false)
  const [showLocationPicker, setShowLocationPicker] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [emojiSearch, setEmojiSearch] = useState('')
  const [emojiCategory, setEmojiCategory] = useState('smileys')
  const [skinTone, setSkinTone] = useState('')
  const [currentLocation, setCurrentLocation] = useState<{ lat: number; lng: number } | null>(null)
  const [locationName, setLocationName] = useState('')
  const [locationSearch, setLocationSearch] = useState('')
  const [searchResults, setSearchResults] = useState<any[]>([])
  const [searching, setSearching] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  // Skin tone modifiers
  const skinTones = [
    { emoji: '🟡', modifier: '', label: 'Default' },
    { emoji: '🏻', modifier: '🏻', label: 'Light' },
    { emoji: '🏼', modifier: '🏼', label: 'Medium-Light' },
    { emoji: '🏽', modifier: '🏽', label: 'Medium' },
    { emoji: '🏾', modifier: '🏾', label: 'Medium-Dark' },
    { emoji: '🏿', modifier: '🏿', label: 'Dark' },
  ]

  // Emoji data with keywords for search
  const emojiData: Record<string, { emoji: string; keywords: string[] }> = {
    '😀': { emoji: '😀', keywords: ['grinning', 'smile', 'happy'] },
    '😃': { emoji: '😃', keywords: ['smiley', 'smile', 'happy'] },
    '😄': { emoji: '😄', keywords: ['smile', 'happy', 'joy'] },
    '😁': { emoji: '😁', keywords: ['grin', 'smile', 'happy'] },
    '😆': { emoji: '😆', keywords: ['laughing', 'satisfied', 'happy'] },
    '😅': { emoji: '😅', keywords: ['sweat', 'smile', 'relief'] },
    '🤣': { emoji: '🤣', keywords: ['rofl', 'laughing', 'floor'] },
    '😂': { emoji: '😂', keywords: ['joy', 'tears', 'laughing'] },
    '🙂': { emoji: '🙂', keywords: ['smile', 'happy'] },
    '😊': { emoji: '😊', keywords: ['blush', 'smile', 'happy'] },
    '😇': { emoji: '😇', keywords: ['innocent', 'angel'] },
    '🥰': { emoji: '🥰', keywords: ['love', 'hearts', 'adore'] },
    '😍': { emoji: '😍', keywords: ['heart eyes', 'love', 'crush'] },
    '🤩': { emoji: '🤩', keywords: ['star struck', 'excited'] },
    '😘': { emoji: '😘', keywords: ['kiss', 'love', 'heart'] },
    '😗': { emoji: '😗', keywords: ['kiss', 'love'] },
    '😚': { emoji: '😚', keywords: ['kiss', 'closed eyes'] },
    '😙': { emoji: '😙', keywords: ['kiss', 'smile'] },
    '😋': { emoji: '😋', keywords: ['yum', 'delicious', 'savoring'] },
    '😛': { emoji: '😛', keywords: ['tongue', 'playful'] },
    '😜': { emoji: '😜', keywords: ['wink', 'tongue', 'playful'] },
    '🤪': { emoji: '🤪', keywords: ['zany', 'crazy', 'goofy'] },
    '😝': { emoji: '😝', keywords: ['tongue', 'closed eyes'] },
    '🤑': { emoji: '🤑', keywords: ['money', 'rich', 'dollar'] },
    '🤗': { emoji: '🤗', keywords: ['hug', 'hugging'] },
    '🤭': { emoji: '🤭', keywords: ['hand over mouth', 'giggle'] },
    '🤫': { emoji: '🤫', keywords: ['shush', 'quiet', 'silence'] },
    '🤔': { emoji: '🤔', keywords: ['thinking', 'hmm'] },
    '🤐': { emoji: '🤐', keywords: ['zipper', 'mouth', 'secret'] },
    '🤨': { emoji: '🤨', keywords: ['raised eyebrow', 'suspicious'] },
    '😐': { emoji: '😐', keywords: ['neutral', 'meh'] },
    '😑': { emoji: '😑', keywords: ['expressionless'] },
    '😶': { emoji: '😶', keywords: ['no mouth', 'silence'] },
    '😏': { emoji: '😏', keywords: ['smirk', 'smug'] },
    '😒': { emoji: '😒', keywords: ['unamused', 'unhappy'] },
    '🙄': { emoji: '🙄', keywords: ['eye roll', 'annoyed'] },
    '😬': { emoji: '😬', keywords: ['grimace', 'awkward'] },
    '😌': { emoji: '😌', keywords: ['relieved', 'content'] },
    '😔': { emoji: '😔', keywords: ['pensive', 'sad'] },
    '😪': { emoji: '😪', keywords: ['sleepy', 'tired'] },
    '🤤': { emoji: '🤤', keywords: ['drool', 'hungry'] },
    '😴': { emoji: '😴', keywords: ['sleeping', 'zzz'] },
    '😷': { emoji: '😷', keywords: ['mask', 'sick', 'doctor'] },
    '🤒': { emoji: '🤒', keywords: ['thermometer', 'sick', 'ill'] },
    '🤕': { emoji: '🤕', keywords: ['bandage', 'hurt', 'injured'] },
    '🤢': { emoji: '🤢', keywords: ['nauseated', 'sick'] },
    '🤮': { emoji: '🤮', keywords: ['vomit', 'sick'] },
    '🤧': { emoji: '🤧', keywords: ['sneeze', 'sick'] },
    '🥵': { emoji: '🥵', keywords: ['hot', 'heat', 'sweating'] },
    '🥶': { emoji: '🥶', keywords: ['cold', 'freezing'] },
    '😵': { emoji: '😵', keywords: ['dizzy', 'confused'] },
    '🤯': { emoji: '🤯', keywords: ['mind blown', 'shocked'] },
    '🤠': { emoji: '🤠', keywords: ['cowboy', 'hat'] },
    '🥳': { emoji: '🥳', keywords: ['party', 'celebrate'] },
    '😎': { emoji: '😎', keywords: ['cool', 'sunglasses'] },
    '🤓': { emoji: '🤓', keywords: ['nerd', 'geek', 'glasses'] },
    '🧐': { emoji: '🧐', keywords: ['monocle', 'thinking'] },
    '😕': { emoji: '😕', keywords: ['confused', 'puzzled'] },
    '😟': { emoji: '😟', keywords: ['worried', 'concerned'] },
    '🙁': { emoji: '🙁', keywords: ['frown', 'sad'] },
    '😮': { emoji: '😮', keywords: ['wow', 'surprised'] },
    '😯': { emoji: '😯', keywords: ['hushed', 'surprised'] },
    '😲': { emoji: '😲', keywords: ['astonished', 'shocked'] },
    '😳': { emoji: '😳', keywords: ['flushed', 'embarrassed'] },
    '🥺': { emoji: '🥺', keywords: ['pleading', 'puppy eyes'] },
    '😦': { emoji: '😦', keywords: ['frown', 'open mouth'] },
    '😧': { emoji: '😧', keywords: ['anguished', 'stunned'] },
    '😨': { emoji: '😨', keywords: ['fearful', 'scared'] },
    '😰': { emoji: '😰', keywords: ['anxious', 'nervous'] },
    '😥': { emoji: '😥', keywords: ['sad', 'relieved'] },
    '😢': { emoji: '😢', keywords: ['cry', 'sad', 'tear'] },
    '😭': { emoji: '😭', keywords: ['sob', 'crying', 'tears'] },
    '😱': { emoji: '😱', keywords: ['scream', 'shocked'] },
    '😖': { emoji: '😖', keywords: ['confounded', 'frustrated'] },
    '😣': { emoji: '😣', keywords: ['persevere', 'struggling'] },
    '😞': { emoji: '😞', keywords: ['disappointed', 'sad'] },
    '😓': { emoji: '😓', keywords: ['sweat', 'downcast'] },
    '😩': { emoji: '😩', keywords: ['weary', 'tired'] },
    '😫': { emoji: '😫', keywords: ['tired', 'exhausted'] },
    '🥱': { emoji: '🥱', keywords: ['yawn', 'tired', 'bored'] },
    '😤': { emoji: '😤', keywords: ['triumph', 'proud'] },
    '😡': { emoji: '😡', keywords: ['angry', 'mad', 'rage'] },
    '😠': { emoji: '😠', keywords: ['angry', 'mad'] },
    '🤬': { emoji: '🤬', keywords: ['cursing', 'swearing', 'symbols'] },
    '😈': { emoji: '😈', keywords: ['devil', 'evil', 'horns'] },
    '👿': { emoji: '👿', keywords: ['devil', 'angry', 'imp'] },
    '💀': { emoji: '💀', keywords: ['skull', 'dead', 'death'] },
    '☠️': { emoji: '☠️', keywords: ['skull', 'crossbones', 'poison'] },
    '💩': { emoji: '💩', keywords: ['poop', 'shit'] },
    '🤡': { emoji: '🤡', keywords: ['clown', 'joker'] },
    '👋': { emoji: '👋', keywords: ['wave', 'hello', 'hi', 'bye'] },
    '🤚': { emoji: '🤚', keywords: ['raised back hand', 'stop'] },
    '✋': { emoji: '✋', keywords: ['hand', 'stop', 'high five'] },
    '🖖': { emoji: '🖖', keywords: ['vulcan', 'spock', 'star trek'] },
    '👌': { emoji: '👌', keywords: ['ok', 'okay', 'perfect'] },
    '🤏': { emoji: '🤏', keywords: ['pinch', 'small'] },
    '✌️': { emoji: '✌️', keywords: ['peace', 'victory'] },
    '🤞': { emoji: '🤞', keywords: ['fingers crossed', 'luck'] },
    '🤟': { emoji: '🤟', keywords: ['love you', 'ily'] },
    '🤘': { emoji: '🤘', keywords: ['rock', 'metal', 'horns'] },
    '🤙': { emoji: '🤙', keywords: ['call me', 'shaka'] },
    '👈': { emoji: '👈', keywords: ['point left', 'left'] },
    '👉': { emoji: '👉', keywords: ['point right', 'right'] },
    '👆': { emoji: '👆', keywords: ['point up', 'up'] },
    '👇': { emoji: '👇', keywords: ['point down', 'down'] },
    '☝️': { emoji: '☝️', keywords: ['index', 'point up'] },
    '👍': { emoji: '👍', keywords: ['thumbs up', 'like', 'yes', 'approve'] },
    '👎': { emoji: '👎', keywords: ['thumbs down', 'dislike', 'no'] },
    '✊': { emoji: '✊', keywords: ['fist', 'punch'] },
    '👊': { emoji: '👊', keywords: ['fist bump', 'punch'] },
    '🤛': { emoji: '🤛', keywords: ['left fist', 'punch'] },
    '🤜': { emoji: '🤜', keywords: ['right fist', 'punch'] },
    '👏': { emoji: '👏', keywords: ['clap', 'applause', 'congrats'] },
    '🙌': { emoji: '🙌', keywords: ['raised hands', 'celebrate', 'hooray'] },
    '👐': { emoji: '👐', keywords: ['open hands', 'hug'] },
    '🤲': { emoji: '🤲', keywords: ['palms up', 'prayer'] },
    '🤝': { emoji: '🤝', keywords: ['handshake', 'deal', 'agreement'] },
    '🙏': { emoji: '🙏', keywords: ['pray', 'thanks', 'please', 'namaste'] },
    '✍️': { emoji: '✍️', keywords: ['writing', 'write'] },
    '💪': { emoji: '💪', keywords: ['muscle', 'strong', 'flex'] },
    '❤️': { emoji: '❤️', keywords: ['heart', 'love', 'red'] },
    '🧡': { emoji: '🧡', keywords: ['orange heart', 'love'] },
    '💛': { emoji: '💛', keywords: ['yellow heart', 'love'] },
    '💚': { emoji: '💚', keywords: ['green heart', 'love'] },
    '💙': { emoji: '💙', keywords: ['blue heart', 'love'] },
    '💜': { emoji: '💜', keywords: ['purple heart', 'love'] },
    '🖤': { emoji: '🖤', keywords: ['black heart', 'dark'] },
    '🤍': { emoji: '🤍', keywords: ['white heart', 'pure'] },
    '🤎': { emoji: '🤎', keywords: ['brown heart'] },
    '💔': { emoji: '💔', keywords: ['broken heart', 'heartbreak'] },
    '💕': { emoji: '💕', keywords: ['two hearts', 'love'] },
    '💞': { emoji: '💞', keywords: ['revolving hearts', 'love'] },
    '💓': { emoji: '💓', keywords: ['beating heart', 'love'] },
    '💗': { emoji: '💗', keywords: ['growing heart', 'love'] },
    '💖': { emoji: '💖', keywords: ['sparkling heart', 'love'] },
    '💘': { emoji: '💘', keywords: ['cupid', 'love', 'arrow'] },
    '💝': { emoji: '💝', keywords: ['heart box', 'gift', 'love'] },
    '🔥': { emoji: '🔥', keywords: ['fire', 'hot', 'lit'] },
    '✨': { emoji: '✨', keywords: ['sparkles', 'shine'] },
    '⭐': { emoji: '⭐', keywords: ['star', 'favorite'] },
    '🌟': { emoji: '🌟', keywords: ['glowing star', 'shine'] },
    '💫': { emoji: '💫', keywords: ['dizzy', 'star'] },
    '💯': { emoji: '💯', keywords: ['hundred', '100', 'perfect'] },
    '✅': { emoji: '✅', keywords: ['check', 'done', 'yes'] },
    '❌': { emoji: '❌', keywords: ['x', 'no', 'wrong'] },
  }

  // Emoji categories - More comprehensive
  const emojiCategories = {
    smileys: {
      name: 'Smileys & People',
      icon: '😊',
      emojis: [
        '😀', '😃', '😄', '😁', '😆', '😅', '🤣', '😂',
        '🙂', '🙃', '🫠', '😉', '😊', '😇', '🥰', '😍',
        '🤩', '😘', '😗', '☺️', '😚', '😙', '🥲', '😋',
        '😛', '😜', '🤪', '😝', '🤑', '🤗', '🤭', '🫢',
        '🫣', '🤫', '🤔', '🫡', '🤐', '🤨', '😐', '😑',
        '😶', '🫥', '😶‍🌫️', '😏', '😒', '🙄', '😬', '😮‍💨',
        '🤥', '😌', '😔', '😪', '🤤', '😴', '😷', '🤒',
        '🤕', '🤢', '🤮', '🤧', '🥵', '🥶', '🥴', '😵',
        '😵‍💫', '🤯', '🤠', '🥳', '🥸', '😎', '🤓', '🧐',
        '😕', '🫤', '😟', '🙁', '☹️', '😮', '😯', '😲',
        '😳', '🥺', '🥹', '😦', '😧', '😨', '😰', '😥',
        '😢', '😭', '😱', '😖', '😣', '😞', '😓', '😩',
        '😫', '🥱', '😤', '😡', '😠', '🤬', '😈', '👿',
        '💀', '☠️', '💩', '🤡', '👹', '👺', '👻', '👽',
        '👾', '🤖', '😺', '😸', '😹', '😻', '😼', '😽',
        '🙀', '😿', '😾',
      ]
    },
    gestures: {
      name: 'Gestures & Body',
      icon: '👍',
      emojis: [
        '👋', '🤚', '🖐️', '✋', '🖖', '🫱', '🫲', '🫳',
        '🫴', '👌', '🤌', '🤏', '✌️', '🤞', '🫰', '🤟',
        '🤘', '🤙', '👈', '👉', '👆', '🖕', '👇', '☝️',
        '🫵', '👍', '👎', '✊', '👊', '🤛', '🤜', '👏',
        '🙌', '🫶', '👐', '🤲', '🤝', '🙏', '✍️', '💅',
        '🤳', '💪', '🦾', '🦿', '🦵', '🦶', '👂', '🦻',
        '👃', '🧠', '🫀', '🫁', '🦷', '🦴', '👀', '👁️',
        '👅', '👄', '🫦', '👶', '🧒', '👦', '👧', '🧑',
        '👱', '👨', '🧔', '👨‍🦰', '👨‍🦱', '👨‍🦳', '👨‍🦲', '👩',
        '👩‍🦰', '👩‍🦱', '👩‍🦳', '👩‍🦲', '🧓', '👴', '👵',
      ]
    },
    animals: {
      name: 'Animals & Nature',
      icon: '🐶',
      emojis: [
        '🐶', '🐱', '🐭', '🐹', '🐰', '🦊', '🐻', '🐼',
        '🐻‍❄️', '🐨', '🐯', '🦁', '🐮', '🐷', '🐽', '🐸',
        '🐵', '🙈', '🙉', '🙊', '🐒', '🐔', '🐧', '🐦',
        '🐤', '🐣', '🐥', '🦆', '🦅', '🦉', '🦇', '🐺',
        '🐗', '🐴', '🦄', '🐝', '🪱', '🐛', '🦋', '🐌',
        '🐞', '🐜', '🪰', '🪲', '🪳', '🦟', '🦗', '🕷️',
        '🕸️', '🦂', '🐢', '🐍', '🦎', '🦖', '🦕', '🐙',
        '🦑', '🦐', '🦞', '🦀', '🐡', '🐠', '🐟', '🐬',
        '🐳', '🐋', '🦈', '🐊', '🐅', '🐆', '🦓', '🦍',
        '🦧', '🦣', '🐘', '🦛', '🦏', '🐪', '🐫', '🦒',
        '🦘', '🦬', '🐃', '🐂', '🐄', '🐎', '🐖', '🐏',
        '🐑', '🦙', '🐐', '🦌', '🐕', '🐩', '🦮', '🐕‍🦺',
      ]
    },
    food: {
      name: 'Food & Drink',
      icon: '🍕',
      emojis: [
        '🍇', '🍈', '🍉', '🍊', '🍋', '🍌', '🍍', '🥭',
        '🍎', '🍏', '🍐', '🍑', '🍒', '🍓', '🫐', '🥝',
        '🍅', '🫒', '🥥', '🥑', '🍆', '🥔', '🥕', '🌽',
        '🌶️', '🫑', '🥒', '🥬', '🥦', '🧄', '🧅', '🍄',
        '🥜', '🫘', '🌰', '🍞', '🥐', '🥖', '🫓', '🥨',
        '🥯', '🥞', '🧇', '🧀', '🍖', '🍗', '🥩', '🥓',
        '🍔', '🍟', '🍕', '🌭', '🥪', '🌮', '🌯', '🫔',
        '🥙', '🧆', '🥚', '🍳', '🥘', '🍲', '🫕', '🥣',
        '🥗', '🍿', '🧈', '🧂', '🥫', '🍱', '🍘', '🍙',
        '🍚', '🍛', '🍜', '🍝', '🍠', '🍢', '🍣', '🍤',
        '🍥', '🥮', '🍡', '🥟', '🥠', '🥡', '🦀', '🦞',
        '🦐', '🦑', '🦪', '🍦', '🍧', '🍨', '🍩', '🍪',
      ]
    },
    activities: {
      name: 'Activities',
      icon: '⚽',
      emojis: [
        '⚽', '🏀', '🏈', '⚾', '🥎', '🎾', '🏐', '🏉',
        '🥏', '🎱', '🪀', '🏓', '🏸', '🏒', '🏑', '🥍',
        '🏏', '🪃', '🥅', '⛳', '🪁', '🏹', '🎣', '🤿',
        '🥊', '🥋', '🎽', '🛹', '🛼', '🛷', '⛸️', '🥌',
        '🎿', '⛷️', '🏂', '🪂', '🏋️', '🤼', '🤸', '🤺',
        '⛹️', '🤾', '🏌️', '🏇', '🧘', '🏊', '🏄', '🚣',
        '🧗', '🚵', '🚴', '🏆', '🥇', '🥈', '🥉', '🏅',
        '🎖️', '🏵️', '🎗️', '🎫', '🎟️', '🎪', '🤹', '🎭',
        '🩰', '🎨', '🎬', '🎤', '🎧', '🎼', '🎹', '🥁',
        '🪘', '🎷', '🎺', '🪗', '🎸', '🪕', '🎻', '🎲',
        '♟️', '🎯', '🎳', '🎮', '🎰', '🧩',
      ]
    },
    travel: {
      name: 'Travel & Places',
      icon: '🚗',
      emojis: [
        '🚗', '🚕', '🚙', '🚌', '🚎', '🏎️', '🚓', '🚑',
        '🚒', '🚐', '🛻', '🚚', '🚛', '🚜', '🦯', '🦽',
        '🦼', '🛴', '🚲', '🛵', '🏍️', '🛺', '🚨', '🚔',
        '🚍', '🚘', '🚖', '🚡', '🚠', '🚟', '🚃', '🚋',
        '🚞', '🚝', '🚄', '🚅', '🚈', '🚂', '🚆', '🚇',
        '🚊', '🚉', '✈️', '🛫', '🛬', '🛩️', '💺', '🛰️',
        '🚀', '🛸', '🚁', '🛶', '⛵', '🚤', '🛥️', '🛳️',
        '⛴️', '🚢', '⚓', '🪝', '⛽', '🚧', '🚦', '🚥',
        '🗺️', '🗿', '🗽', '🗼', '🏰', '🏯', '🏟️', '🎡',
        '🎢', '🎠', '⛲', '⛱️', '🏖️', '🏝️', '🏜️', '🌋',
        '⛰️', '🏔️', '🗻', '🏕️', '⛺', '🛖', '🏠', '🏡',
      ]
    },
    objects: {
      name: 'Objects',
      icon: '💡',
      emojis: [
        '⌚', '📱', '📲', '💻', '⌨️', '🖥️', '🖨️', '🖱️',
        '🖲️', '🕹️', '🗜️', '💾', '💿', '📀', '📼', '📷',
        '📸', '📹', '🎥', '📽️', '🎞️', '📞', '☎️', '📟',
        '📠', '📺', '📻', '🎙️', '🎚️', '🎛️', '🧭', '⏱️',
        '⏲️', '⏰', '🕰️', '⌛', '⏳', '📡', '🔋', '🔌',
        '💡', '🔦', '🕯️', '🪔', '🧯', '🛢️', '💸', '💵',
        '💴', '💶', '💷', '🪙', '💰', '💳', '💎', '⚖️',
        '🪜', '🧰', '🪛', '🔧', '🔨', '⚒️', '🛠️', '⛏️',
        '🪚', '🔩', '⚙️', '🪤', '🧱', '⛓️', '🧲', '🔫',
        '💣', '🧨', '🪓', '🔪', '🗡️', '⚔️', '🛡️', '🚬',
        '⚰️', '🪦', '⚱️', '🏺', '🔮', '📿', '🧿', '💈',
      ]
    },
    symbols: {
      name: 'Symbols',
      icon: '❤️',
      emojis: [
        '❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍',
        '🤎', '💔', '❤️‍🔥', '❤️‍🩹', '❣️', '💕', '💞', '💓',
        '💗', '💖', '💘', '💝', '💟', '☮️', '✝️', '☪️',
        '🕉️', '☸️', '✡️', '🔯', '🕎', '☯️', '☦️', '🛐',
        '⛎', '♈', '♉', '♊', '♋', '♌', '♍', '♎',
        '♏', '♐', '♑', '♒', '♓', '🆔', '⚛️', '🉑',
        '☢️', '☣️', '📴', '📳', '🈶', '🈚', '🈸', '🈺',
        '🈷️', '✴️', '🆚', '💮', '🉐', '㊙️', '㊗️', '🈴',
        '🈵', '🈹', '🈲', '🅰️', '🅱️', '🆎', '🆑', '🅾️',
        '🆘', '❌', '⭕', '🛑', '⛔', '📛', '🚫', '💯',
        '💢', '♨️', '🚷', '🚯', '🚳', '🚱', '🔞', '📵',
        '🚭', '❗', '❕', '❓', '❔', '‼️', '⁉️', '🔅',
      ]
    },
    flags: {
      name: 'Flags',
      icon: '🏁',
      emojis: [
        '🏁', '🚩', '🎌', '🏴', '🏳️', '🏳️‍🌈', '🏳️‍⚧️', '🏴‍☠️',
        '🇦🇨', '🇦🇩', '🇦🇪', '🇦🇫', '🇦🇬', '🇦🇮', '🇦🇱', '🇦🇲',
        '🇦🇴', '🇦🇶', '🇦🇷', '🇦🇸', '🇦🇹', '🇦🇺', '🇦🇼', '🇦🇽',
        '🇦🇿', '🇧🇦', '🇧🇧', '🇧🇩', '🇧🇪', '🇧🇫', '🇧🇬', '🇧🇭',
        '🇧🇮', '🇧🇯', '🇧🇱', '🇧🇲', '🇧🇳', '🇧🇴', '🇧🇶', '🇧🇷',
        '🇧🇸', '🇧🇹', '🇧🇻', '🇧🇼', '🇧🇾', '🇧🇿', '🇨🇦', '🇨🇨',
        '🇨🇩', '🇨🇫', '🇨🇬', '🇨🇭', '🇨🇮', '🇨🇰', '🇨🇱', '🇨🇲',
        '🇨🇳', '🇨🇴', '🇨🇵', '🇨🇷', '🇨🇺', '🇨🇻', '🇨🇼', '🇨🇽',
        '🇨🇾', '🇨🇿', '🇩🇪', '🇩🇬', '🇩🇯', '🇩🇰', '🇩🇲', '🇩🇴',
        '🇩🇿', '🇪🇦', '🇪🇨', '🇪🇪', '🇪🇬', '🇪🇭', '🇪🇷', '🇪🇸',
        '🇪🇹', '🇪🇺', '🇫🇮', '🇫🇯', '🇫🇰', '🇫🇲', '🇫🇴', '🇫🇷',
        '🇬🇦', '🇬🇧', '🇬🇩', '🇬🇪', '🇬🇫', '🇬🇬', '🇬🇭', '🇬🇮',
      ]
    },
  }

  // Attachment menu items - Simplified
  const attachmentMenuItems = [
    { icon: ImageIcon, label: 'Image', color: 'text-green-600', action: 'image' },
    { icon: Video, label: 'Video', color: 'text-blue-600', action: 'video' },
    { icon: Mic, label: 'Audio', color: 'text-orange-600', action: 'audio' },
    { icon: FileText, label: 'Document', color: 'text-purple-600', action: 'document' },
    { icon: MapPin, label: 'Location', color: 'text-red-600', action: 'location' },
  ]

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: (acceptedFiles) => {
      if (acceptedFiles.length > 0) {
        setSelectedFile(acceptedFiles[0])
      }
    },
    accept: {
      'image/*': ['.png', '.jpg', '.jpeg', '.gif', '.webp'],
      'video/*': ['.mp4', '.mov'],
      'audio/*': ['.mp3', '.ogg', '.wav'],
      'application/pdf': ['.pdf'],
      'application/msword': ['.doc'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
    },
    maxSize: 16 * 1024 * 1024, // 16MB
    multiple: false,
    noClick: true,
  })

  const handleEmojiClick = (emoji: string) => {
    const cursorPosition = inputRef.current?.selectionStart || value.length
    // Apply skin tone if emoji supports it
    const emojiWithSkinTone = skinTone && emoji.match(/👋|🤚|✋|🖖|👌|🤏|✌️|🤞|🤟|🤘|🤙|👈|👉|👆|👇|☝️|👍|👎|✊|👊|🤛|🤜|👏|🙌|👐|🤲|🤝|🙏|✍️|💪/)
      ? emoji + skinTone
      : emoji
    const newValue =
      value.slice(0, cursorPosition) + emojiWithSkinTone + value.slice(cursorPosition)
    onChange(newValue)
    inputRef.current?.focus()
  }

  const handleAttachmentAction = (action: string) => {
    setShowAttachmentMenu(false)
    
    switch (action) {
      case 'image':
      case 'video':
      case 'document':
      case 'audio':
        const input = document.createElement('input')
        input.type = 'file'
        
        if (action === 'image') {
          input.accept = 'image/*'
        } else if (action === 'video') {
          input.accept = 'video/*'
        } else if (action === 'document') {
          input.accept = '.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx'
        } else if (action === 'audio') {
          input.accept = 'audio/*'
        }
        
        input.onchange = (e) => {
          const file = (e.target as HTMLInputElement).files?.[0]
          if (file) setSelectedFile(file)
        }
        input.click()
        break
        
      case 'location':
        // Get current location
        if (navigator.geolocation) {
          navigator.geolocation.getCurrentPosition(
            (position) => {
              setCurrentLocation({
                lat: position.coords.latitude,
                lng: position.coords.longitude
              })
              setShowLocationPicker(true)
            },
            (error) => {
              console.error('Error getting location:', error)
              alert('Unable to get your location. Please enable location services.')
            }
          )
        } else {
          alert('Geolocation is not supported by your browser')
        }
        break
    }
  }

  const handleSendLocation = () => {
    if (currentLocation) {
      const locationMessage = `📍 Location: ${locationName || 'My Location'}\nhttps://www.google.com/maps?q=${currentLocation.lat},${currentLocation.lng}`
      onChange(locationMessage)
      setShowLocationPicker(false)
      setLocationName('')
      setLocationSearch('')
      setSearchResults([])
    }
  }

  const handleSearchLocation = async () => {
    if (!locationSearch.trim()) return

    setSearching(true)
    try {
      // Using Nominatim API (OpenStreetMap geocoding service - FREE)
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(locationSearch)}&limit=5`,
        {
          headers: {
            'User-Agent': 'ChatApp/1.0' // Required by Nominatim
          }
        }
      )
      const data = await response.json()
      setSearchResults(data)
    } catch (error) {
      console.error('Error searching location:', error)
      alert('Failed to search location. Please try again.')
    } finally {
      setSearching(false)
    }
  }

  const handleSelectSearchResult = (result: any) => {
    setCurrentLocation({
      lat: parseFloat(result.lat),
      lng: parseFloat(result.lon)
    })
    setLocationName(result.display_name)
    setSearchResults([])
    setLocationSearch('')
  }

  const filteredEmojis = emojiSearch
    ? Object.values(emojiData)
        .filter(item => 
          item.keywords.some(keyword => 
            keyword.toLowerCase().includes(emojiSearch.toLowerCase())
          ) || item.emoji.includes(emojiSearch)
        )
        .map(item => item.emoji)
    : emojiCategories[emojiCategory as keyof typeof emojiCategories]?.emojis || []

  const handleSend = () => {
    if ((!value.trim() && !selectedFile) || disabled || sending) return

    let media: MediaAttachment | undefined

    if (selectedFile) {
      // Determine media type from file
      let mediaType: 'image' | 'video' | 'audio' | 'document' = 'document'
      if (selectedFile.type.startsWith('image/')) mediaType = 'image'
      else if (selectedFile.type.startsWith('video/')) mediaType = 'video'
      else if (selectedFile.type.startsWith('audio/')) mediaType = 'audio'

      media = {
        file: selectedFile,
        type: mediaType,
      }
    }

    onSend(media)
    setSelectedFile(null)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div className="bg-white p-2" {...getRootProps()}>
      <input {...getInputProps()} />
      
      {isDragActive && (
        <div className="absolute inset-0 bg-green-50 border-2 border-dashed border-green-500 flex items-center justify-center z-10">
          <p className="text-green-600 font-medium">Drop file here...</p>
        </div>
      )}

      {/* Selected file preview */}
      {selectedFile && (
        <div className="mb-2 p-2 bg-gray-50 rounded-md flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Paperclip className="h-4 w-4 text-gray-500" />
            <div className="flex-1 min-w-0">
              <p className="text-sm text-gray-700 truncate">{selectedFile.name}</p>
              <p className="text-xs text-gray-500">
                {(selectedFile.size / 1024).toFixed(1)} KB
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSelectedFile(null)}
            className="h-7 w-7 p-0"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      )}

      {/* Input area */}
      <div className="flex items-center space-x-1">
        {/* Attachment Menu */}
        <Popover open={showAttachmentMenu} onOpenChange={setShowAttachmentMenu}>
          <PopoverTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="text-gray-500 hover:text-gray-700 h-9 w-9"
              type="button"
            >
              <Plus className="h-5 w-5" />
            </Button>
          </PopoverTrigger>
          <PopoverContent side="top" align="start" className="w-auto p-3">
            <div className="flex flex-col gap-2">
              {attachmentMenuItems.map((item) => (
                <button
                  key={item.action}
                  onClick={() => handleAttachmentAction(item.action)}
                  className="flex items-center gap-3 px-4 py-2 rounded-lg hover:bg-gray-100 transition-colors text-left min-w-[180px]"
                >
                  <item.icon className={`h-5 w-5 ${item.color}`} />
                  <span className="text-sm font-medium text-gray-700">{item.label}</span>
                </button>
              ))}
            </div>
          </PopoverContent>
        </Popover>

        {/* Input field */}
        <Input
          ref={inputRef}
          placeholder="Type a message..."
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={onFocus}
          disabled={disabled || sending}
          className="flex-1 h-9"
        />

        {/* Emoji Picker */}
        <Popover open={showEmojiPicker} onOpenChange={setShowEmojiPicker}>
          <PopoverTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="text-gray-500 hover:text-gray-700 h-9 w-9"
              type="button"
            >
              <Smile className="h-5 w-5" />
            </Button>
          </PopoverTrigger>
          <PopoverContent side="top" align="end" className="w-80 p-0">
            <div className="flex flex-col h-96">
              {/* Search with clear button */}
              <div className="p-2 border-b">
                <div className="relative">
                  <Input
                    placeholder="Search emoji"
                    value={emojiSearch}
                    onChange={(e) => setEmojiSearch(e.target.value)}
                    className="h-8 text-sm pr-8"
                  />
                  {emojiSearch && (
                    <button
                      onClick={() => setEmojiSearch('')}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>

              {/* Category tabs and Skin Tone */}
              {!emojiSearch && (
                <div className="flex items-center justify-between p-2 border-b">
                  <div className="flex gap-1 overflow-x-auto flex-1">
                    {Object.entries(emojiCategories).map(([key, cat]) => (
                      <button
                        key={key}
                        onClick={() => setEmojiCategory(key)}
                        className={`px-3 py-1.5 text-lg rounded transition-colors shrink-0 ${
                          emojiCategory === key
                            ? 'bg-blue-100'
                            : 'hover:bg-gray-100'
                        }`}
                        title={cat.name}
                      >
                        {cat.icon}
                      </button>
                    ))}
                  </div>
                  
                  {/* Skin Tone Selector */}
                  <Popover>
                    <PopoverTrigger asChild>
                      <button
                        className="ml-2 px-2 py-1.5 text-lg rounded hover:bg-gray-100 transition-colors shrink-0"
                        title="Skin tone"
                      >
                        {skinTone ? skinTone : '🟡'}
                      </button>
                    </PopoverTrigger>
                    <PopoverContent side="left" className="w-auto p-2">
                      <div className="flex flex-col gap-1">
                        {skinTones.map((tone) => (
                          <button
                            key={tone.modifier}
                            onClick={() => setSkinTone(tone.modifier)}
                            className={`px-3 py-2 text-lg rounded hover:bg-gray-100 transition-colors text-left ${
                              skinTone === tone.modifier ? 'bg-blue-100' : ''
                            }`}
                            title={tone.label}
                          >
                            {tone.emoji} {tone.label}
                          </button>
                        ))}
                      </div>
                    </PopoverContent>
                  </Popover>
                </div>
              )}

              {/* Emoji grid */}
              <div className="flex-1 overflow-y-auto p-2">
                <div className="grid grid-cols-8 gap-1">
                  {filteredEmojis.map((emoji, index) => (
                    <button
                      key={index}
                      onClick={() => handleEmojiClick(emoji)}
                      className="text-2xl hover:bg-gray-100 rounded p-1 transition-colors"
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </PopoverContent>
        </Popover>

        {/* Send button */}
        <Button
          onClick={handleSend}
          disabled={(!value.trim() && !selectedFile) || disabled || sending}
          className="bg-blue-600 hover:bg-blue-700 h-9 px-4"
        >
          {sending ? (
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
          ) : (
            <Send className="h-4 w-4" />
          )}
        </Button>
      </div>

      {/* Location Picker Modal */}
      <Dialog open={showLocationPicker} onOpenChange={setShowLocationPicker}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>Share Location</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 overflow-y-auto flex-1 pr-2">
            {/* Search Location */}
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">
                Search Location
              </label>
              <div className="flex gap-2">
                <Input
                  placeholder="Search for a place, address, or landmark..."
                  value={locationSearch}
                  onChange={(e) => setLocationSearch(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleSearchLocation()
                    }
                  }}
                  className="flex-1"
                />
                <Button
                  onClick={handleSearchLocation}
                  disabled={searching || !locationSearch.trim()}
                  variant="outline"
                >
                  {searching ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-600"></div>
                  ) : (
                    'Search'
                  )}
                </Button>
              </div>
            </div>

            {/* Search Results */}
            {searchResults.length > 0 && (
              <div className="border rounded-lg max-h-40 overflow-y-auto">
                {searchResults.map((result, index) => (
                  <button
                    key={index}
                    onClick={() => handleSelectSearchResult(result)}
                    className="w-full text-left px-3 py-2 hover:bg-gray-50 border-b last:border-b-0 transition-colors"
                  >
                    <div className="flex items-start gap-2">
                      <MapPin className="h-4 w-4 text-red-500 mt-0.5 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {result.display_name.split(',')[0]}
                        </p>
                        <p className="text-xs text-gray-500 line-clamp-1">
                          {result.display_name}
                        </p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}

            {/* Location Name Input */}
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">
                Location Name (Optional)
              </label>
              <Input
                placeholder="e.g., My Office, Home, etc."
                value={locationName}
                onChange={(e) => setLocationName(e.target.value)}
                className="w-full"
              />
            </div>

            {/* Map Preview with Leaflet */}
            {currentLocation && (
              <div className="space-y-2">
                {/* Leaflet Map */}
                <Suspense fallback={
                  <div className="w-full h-48 bg-gray-100 rounded-lg border flex items-center justify-center">
                    <div className="text-center">
                      <MapPin className="h-8 w-8 text-red-500 mx-auto mb-2" />
                      <p className="text-sm text-gray-600">Loading map...</p>
                    </div>
                  </div>
                }>
                  <LocationMap
                    latitude={currentLocation.lat}
                    longitude={currentLocation.lng}
                    locationName={locationName || 'My Location'}
                  />
                </Suspense>
                
                {/* Location Info */}
                <div className="bg-gray-50 p-2.5 rounded-lg border">
                  <div className="flex items-center justify-between text-xs">
                    <div className="space-y-0.5">
                      <p className="text-gray-600">
                        <span className="font-medium">Lat:</span> {currentLocation.lat.toFixed(6)}
                      </p>
                      <p className="text-gray-600">
                        <span className="font-medium">Lng:</span> {currentLocation.lng.toFixed(6)}
                      </p>
                    </div>
                    <a
                      href={`https://www.google.com/maps?q=${currentLocation.lat},${currentLocation.lng}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline text-xs flex items-center gap-1"
                    >
                      View on Google Maps
                      <span>→</span>
                    </a>
                  </div>
                </div>
              </div>
            )}
          </div>

          <DialogFooter className="mt-4 pt-4 border-t shrink-0">
            <Button
              variant="outline"
              onClick={() => {
                setShowLocationPicker(false)
                setLocationSearch('')
                setSearchResults([])
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSendLocation}
              disabled={!currentLocation}
              className="bg-blue-600 hover:bg-blue-700"
            >
              <MapPin className="h-4 w-4 mr-2" />
              Send Location
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
