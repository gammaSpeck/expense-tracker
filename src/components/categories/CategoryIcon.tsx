import { icons, LucideIcon, MoreHorizontal } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CategoryIconProps {
  icon: string;
  color: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const sizeClasses = {
  sm: 'h-8 w-8',
  md: 'h-10 w-10',
  lg: 'h-12 w-12',
};

const iconSizeClasses = {
  sm: 'h-4 w-4',
  md: 'h-5 w-5',
  lg: 'h-6 w-6',
};

export function CategoryIcon({ icon, color, size = 'md', className }: CategoryIconProps) {
  const IconComponent = icons[icon as keyof typeof icons] as LucideIcon | undefined;
  const Icon = IconComponent || MoreHorizontal;

  return (
    <div
      className={cn(
        'category-icon shrink-0',
        sizeClasses[size],
        className
      )}
      style={{ backgroundColor: `${color}20` }}
    >
      <Icon
        className={iconSizeClasses[size]}
        style={{ color }}
      />
    </div>
  );
}

// Available icons for category picker
export const AVAILABLE_ICONS = [
  'UtensilsCrossed', 'Coffee', 'Pizza', 'Apple', 'Wine',
  'ShoppingBag', 'ShoppingCart', 'Gift', 'Shirt', 'Watch',
  'Car', 'Bus', 'Train', 'Plane', 'Fuel', 'Bike',
  'Heart', 'Pill', 'Stethoscope', 'Activity', 'Thermometer',
  'FileText', 'Receipt', 'CreditCard', 'Wallet', 'Banknote',
  'Tv', 'Gamepad2', 'Music', 'Film', 'Headphones', 'Camera',
  'Home', 'Building', 'Key', 'Bed', 'Sofa',
  'GraduationCap', 'BookOpen', 'Pencil', 'Lightbulb',
  'Dumbbell', 'Trophy', 'Target', 'Medal',
  'Smartphone', 'Laptop', 'Monitor', 'Wifi', 'Battery',
  'Baby', 'Dog', 'Cat', 'Flower', 'Sun', 'Umbrella',
  'Scissors', 'Brush', 'Sparkles', 'Star',
  'MoreHorizontal', 'CircleDot', 'Tag', 'Bookmark',
];

interface IconPickerProps {
  value: string;
  onChange: (icon: string) => void;
  color: string;
}

export function IconPicker({ value, onChange, color }: IconPickerProps) {
  return (
    <div className="grid grid-cols-8 gap-2 max-h-48 overflow-y-auto p-2 bg-muted/30 rounded-lg">
      {AVAILABLE_ICONS.map((iconName) => {
        const IconComponent = icons[iconName as keyof typeof icons] as LucideIcon | undefined;
        if (!IconComponent) return null;
        const isSelected = value === iconName;

        return (
          <button
            key={iconName}
            type="button"
            onClick={() => onChange(iconName)}
            className={cn(
              'p-2 rounded-lg transition-all duration-200',
              isSelected
                ? 'bg-primary/20 ring-2 ring-primary'
                : 'hover:bg-muted'
            )}
          >
            <IconComponent
              className="h-5 w-5 mx-auto"
              style={{ color: isSelected ? color : undefined }}
            />
          </button>
        );
      })}
    </div>
  );
}
