import type { LucideIcon } from 'lucide-react';
import {
  Calendar, CalendarDays, Building2, Store, Tag, Ticket, Briefcase, Newspaper, MapPin, Map as MapIcon,
  Mail, UserPlus, Users, Phone, Info, HeartHandshake, Handshake, Megaphone, Bell, Star, Award, Trophy,
  Gift, ShoppingBag, Utensils, Coffee, Beer, Bed, Car, Fuel, Tractor, Wheat, Sprout, TreePine, Sun,
  CloudSun, GraduationCap, School, Church, Hospital, Stethoscope, Heart, Baby, Dog, Camera,
  Image as ImageIcon, Video, Music, BookOpen, Library, Landmark, Flag, Globe, Link as LinkIcon, FileText,
  ClipboardList, DollarSign, CreditCard, House, HousePlus, Wrench, Hammer, CircleHelp, MessageCircle, Circle } from
'lucide-react';

/** Curated icons offered in the admin picker (the public app only renders these). */
export const HOME_ICONS: Record<string, LucideIcon> = {
  calendar: Calendar,
  'calendar-days': CalendarDays,
  'building-2': Building2,
  store: Store,
  tag: Tag,
  ticket: Ticket,
  briefcase: Briefcase,
  newspaper: Newspaper,
  'map-pin': MapPin,
  map: MapIcon,
  mail: Mail,
  'user-plus': UserPlus,
  users: Users,
  phone: Phone,
  info: Info,
  'heart-handshake': HeartHandshake,
  handshake: Handshake,
  megaphone: Megaphone,
  bell: Bell,
  star: Star,
  award: Award,
  trophy: Trophy,
  gift: Gift,
  'shopping-bag': ShoppingBag,
  utensils: Utensils,
  coffee: Coffee,
  beer: Beer,
  bed: Bed,
  car: Car,
  fuel: Fuel,
  tractor: Tractor,
  wheat: Wheat,
  sprout: Sprout,
  'tree-pine': TreePine,
  sun: Sun,
  'cloud-sun': CloudSun,
  'graduation-cap': GraduationCap,
  school: School,
  church: Church,
  hospital: Hospital,
  stethoscope: Stethoscope,
  heart: Heart,
  baby: Baby,
  dog: Dog,
  camera: Camera,
  image: ImageIcon,
  video: Video,
  music: Music,
  'book-open': BookOpen,
  library: Library,
  landmark: Landmark,
  flag: Flag,
  globe: Globe,
  link: LinkIcon,
  'file-text': FileText,
  'clipboard-list': ClipboardList,
  'dollar-sign': DollarSign,
  'credit-card': CreditCard,
  home: House,
  'house-plus': HousePlus,
  wrench: Wrench,
  hammer: Hammer,
  'help-circle': CircleHelp,
  'message-circle': MessageCircle
};

export const HOME_ICON_NAMES = Object.keys(HOME_ICONS);

/** Unknown names show a circle. */
export function getHomeIcon(name: string | null | undefined): LucideIcon {
  return (name && HOME_ICONS[name]) || Circle;
}
