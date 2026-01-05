import React, { useRef, useState } from 'react';
import { cn } from '../../lib/utils';

const TiltCard = ({ children, className, onClick, gradient = "from-white/50 to-transparent" }) => {
    const ref = useRef(null);
    const [transform, setTransform] = useState('');
    const [opacity, setOpacity] = useState(0);
    const [background, setBackground] = useState('');

    const handleMouseMove = (e) => {
        if (!ref.current) return;

        const rect = ref.current.getBoundingClientRect();
        const width = rect.width;
        const height = rect.height;
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;

        const xPct = mouseX / width - 0.5; // -0.5 to 0.5
        const yPct = mouseY / height - 0.5;

        // Calculate rotation (Max 10 degrees)
        const xRot = yPct * -20; // Invert axis for tilt
        const yRot = xPct * 20;

        setTransform(`perspective(1000px) rotateX(${xRot}deg) rotateY(${yRot}deg) scale3d(1.02, 1.02, 1.02)`);
        setOpacity(1);

        // Dynamic Glare Position
        setBackground(`radial-gradient(circle at ${mouseX}px ${mouseY}px, rgba(255,255,255,0.3) 0%, transparent 80%)`);
    };

    const handleMouseLeave = () => {
        setTransform('perspective(1000px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)');
        setOpacity(0);
    };

    return (
        <div
            ref={ref}
            className={cn("relative transition-all duration-200 ease-out transform-gpu preserve-3d", className)}
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
            onClick={onClick}
            style={{ transform }}
        >
            {/* Glare Overlay */}
            <div
                className="absolute inset-0 pointer-events-none z-20 rounded-xl transition-opacity duration-200"
                style={{
                    opacity,
                    background
                }}
            />

            {/* Content */}
            <div className="relative z-10 h-full">
                {children}
            </div>
        </div>
    );
};

export default TiltCard;
