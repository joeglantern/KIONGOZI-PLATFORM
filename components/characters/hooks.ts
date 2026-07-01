import { useState, useEffect, RefObject } from 'react';

export function useCursorTracking(ref: RefObject<HTMLElement | SVGElement>) {
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [isHovering, setIsHovering] = useState(false);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!ref.current) return;
      const rect = ref.current.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      
      // Calculate normalized distance from center (-1 to 1 based on window width/height)
      const x = (e.clientX - centerX) / window.innerWidth;
      const y = (e.clientY - centerY) / window.innerHeight;
      
      setMousePosition({ x, y });

      // Check if mouse is near the element (e.g. within 1.5x width radius)
      const distance = Math.sqrt(Math.pow(e.clientX - centerX, 2) + Math.pow(e.clientY - centerY, 2));
      setIsHovering(distance < rect.width * 1.5);
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, [ref]);

  return { mousePosition, isHovering };
}
