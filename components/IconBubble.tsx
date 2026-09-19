import React from 'react';

export default function IconBubble({ children, tone = 'mint', size = 'md' }: { children: React.ReactNode; tone?: 'mint' | 'rose' | 'butter' | 'sky' | 'cream'; size?: 'sm' | 'md' | 'lg' }) {
  return <span className={`icon-bubble tone-${tone} size-${size}`}>{children}<i /></span>;
}
