import React from 'react';

interface TabsProps {
  defaultValue: string;
  children: React.ReactNode;
  className?: string;
}

export function Tabs({ defaultValue, children, className = '' }: TabsProps) {
  const [activeTab, setActiveTab] = React.useState(defaultValue);

  // Clone children and inject the active state
  const childrenWithProps = React.Children.map(children, (child) => {
    if (React.isValidElement(child)) {
      if (child.type === TabsContent) {
        return React.cloneElement(child, {
          active: activeTab === child.props.value,
        });
      }
      if (child.type === TabsList) {
        // Pass the setActiveTab function to TabsList
        return React.cloneElement(child, {
          activeTab,
          setActiveTab,
        });
      }
    }
    return child;
  });

  return <div className={className}>{childrenWithProps}</div>;
}

interface TabsListProps {
  children: React.ReactNode;
  className?: string;
  activeTab?: string;
  setActiveTab?: (value: string) => void;
}

export function TabsList({ 
  children, 
  className = '',
  activeTab, 
  setActiveTab 
}: TabsListProps) {
  // Clone children and inject the active state and click handler
  const childrenWithProps = React.Children.map(children, (child) => {
    if (React.isValidElement(child) && child.type === TabsTrigger) {
      return React.cloneElement(child, {
        active: activeTab === child.props.value,
        onClick: () => setActiveTab?.(child.props.value),
      });
    }
    return child;
  });

  return <div className={className}>{childrenWithProps}</div>;
}

interface TabsTriggerProps {
  value: string;
  children: React.ReactNode;
  className?: string;
  active?: boolean;
  onClick?: () => void;
}

export function TabsTrigger({ 
  value, 
  children, 
  className = '',
  active = false,
  onClick 
}: TabsTriggerProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      data-state={active ? 'active' : 'inactive'}
      className={className}
    >
      {children}
    </button>
  );
}

interface TabsContentProps {
  value: string;
  children: React.ReactNode;
  className?: string;
  active?: boolean;
}

export function TabsContent({ 
  value, 
  children, 
  className = '',
  active = false 
}: TabsContentProps) {
  if (!active) return null;
  
  return <div className={className}>{children}</div>;
} 