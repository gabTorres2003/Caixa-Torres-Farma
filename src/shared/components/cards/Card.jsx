import React from 'react';

export const Card = ({ children, title, icon: Icon, className = '', style }) => {
  return (
    <div className={`card ${className}`} style={style}>
      {title && (
        <h3 className="card-title">
          {Icon && <Icon size={24} />}
          {title}
        </h3>
      )}
      <div className="card-body">
        {children}
      </div>
    </div>
  );
};