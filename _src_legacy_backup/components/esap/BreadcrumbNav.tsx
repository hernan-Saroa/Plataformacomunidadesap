import { 
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '../ui/breadcrumb';
import { Home, ChevronRight } from 'lucide-react';
import { motion } from 'motion/react';

interface BreadcrumbNavProps {
  items: Array<{
    label: string;
    href?: string;
    icon?: React.ComponentType<{ className?: string }>;
  }>;
}

export function BreadcrumbNav({ items }: BreadcrumbNavProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Breadcrumb>
        <BreadcrumbList className="text-sm">
          <BreadcrumbItem>
            <BreadcrumbLink 
              href="#" 
              className="flex items-center gap-1.5 text-[--esap-gray-600] hover:text-[--esap-primary] transition-colors"
            >
              <Home className="w-4 h-4" />
              Inicio
            </BreadcrumbLink>
          </BreadcrumbItem>
          
          {items.map((item, index) => {
            const isLast = index === items.length - 1;
            const Icon = item.icon;
            
            return (
              <div key={index} className="flex items-center gap-1.5">
                <BreadcrumbSeparator>
                  <ChevronRight className="w-4 h-4 text-[--esap-gray-400]" />
                </BreadcrumbSeparator>
                
                <BreadcrumbItem>
                  {isLast ? (
                    <BreadcrumbPage className="flex items-center gap-1.5 text-[--esap-gray-900] font-medium">
                      {Icon && <Icon className="w-4 h-4" />}
                      {item.label}
                    </BreadcrumbPage>
                  ) : (
                    <BreadcrumbLink 
                      href={item.href || '#'}
                      className="flex items-center gap-1.5 text-[--esap-gray-600] hover:text-[--esap-primary] transition-colors"
                    >
                      {Icon && <Icon className="w-4 h-4" />}
                      {item.label}
                    </BreadcrumbLink>
                  )}
                </BreadcrumbItem>
              </div>
            );
          })}
        </BreadcrumbList>
      </Breadcrumb>
    </motion.div>
  );
}
