import {
  AlignLeft, AppWindow, ArrowDown, ArrowUp, BarChart3, Bell, BellRing, Bold, BookOpen, Box, Calendar, Check, CheckSquare, ChevronDown,
  ChevronLeft, ChevronRight, CircleAlert, CircleHelp, Clock, Copy, CreditCard, Download, Eye, EyeOff, File, FileJson, FileText, Flame,
  FolderOpen, Grid2x2, Hash, Home, Image, Inbox, Info, Keyboard, LayoutDashboard, LayoutGrid, LayoutTemplate, Link, List, ListChecks,
  Loader, Lock, LockOpen, Mail, Maximize, Menu, MessageSquare, Minus, Monitor, Moon, MousePointer2, MoveDown, MoveUp, Palette, PanelLeft,
  PanelTop, PanelBottom, PieChart, Play, Plus, Quote, Redo2, RectangleHorizontal, Rows3, Search, Settings, Share2, Smartphone, Sparkle,
  SplitSquareHorizontal, Square, Star, Sun, Table, Tablet, Tag, Terminal, TextCursorInput, ToggleRight, Trash2, TrendingUp, Type, Undo2,
  Upload, User, Users, X, Zap, Activity, GalleryHorizontal, Gauge, Layers, MessageCircle, Megaphone, Milestone, ZoomIn, ZoomOut,
  type LucideIcon,
} from 'lucide-react'

const MAP: Record<string, LucideIcon> = {
  'align-left': AlignLeft, 'app-window': AppWindow, 'arrow-down': ArrowDown, 'arrow-up': ArrowUp, 'bar-chart': BarChart3, bell: Bell,
  'bell-ring': BellRing, bold: Bold, 'book-open': BookOpen, box: Box, calendar: Calendar, check: Check, 'check-square': CheckSquare,
  'chevron-down': ChevronDown, 'chevron-left': ChevronLeft, 'chevron-right': ChevronRight, 'circle-alert': CircleAlert,
  'circle-help': CircleHelp, clock: Clock, copy: Copy, 'credit-card': CreditCard, download: Download, eye: Eye, 'eye-off': EyeOff,
  file: File, 'file-json': FileJson, 'file-text': FileText, flame: Flame, 'folder-open': FolderOpen, grid: Grid2x2, hash: Hash,
  home: Home, image: Image, inbox: Inbox, info: Info, keyboard: Keyboard, 'layout-dashboard': LayoutDashboard, 'layout-grid': LayoutGrid,
  'layout-template': LayoutTemplate, link: Link, list: List, 'list-checks': ListChecks, loader: Loader, lock: Lock, 'lock-open': LockOpen,
  mail: Mail, maximize: Maximize, menu: Menu, 'message-square': MessageSquare, minus: Minus, monitor: Monitor, moon: Moon,
  pointer: MousePointer2, 'move-down': MoveDown, 'move-up': MoveUp, palette: Palette, 'panel-left': PanelLeft, 'panel-top': PanelTop,
  'panel-bottom': PanelBottom, 'pie-chart': PieChart, play: Play, plus: Plus, quote: Quote, redo: Redo2, rect: RectangleHorizontal,
  rows: Rows3, search: Search, settings: Settings, share: Share2, smartphone: Smartphone, sparkle: Sparkle, split: SplitSquareHorizontal,
  square: Square, star: Star, sun: Sun, table: Table, tablet: Tablet, tag: Tag, terminal: Terminal, 'text-input': TextCursorInput,
  toggle: ToggleRight, trash: Trash2, trending: TrendingUp, type: Type, undo: Undo2, upload: Upload, user: User, users: Users, x: X,
  zap: Zap, activity: Activity, gallery: GalleryHorizontal, gauge: Gauge, layers: Layers, 'message-circle': MessageCircle,
  megaphone: Megaphone, milestone: Milestone, 'zoom-in': ZoomIn, 'zoom-out': ZoomOut,
}

export const ICON_NAMES = Object.keys(MAP)

export function Icon({ name, size = 16, className }: { name: string; size?: number; className?: string }) {
  const C = MAP[name] ?? Square
  return <C size={size} strokeWidth={1.75} className={className} aria-hidden="true" focusable="false" />
}
