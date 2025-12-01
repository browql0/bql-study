import { useEffect } from 'react';

function usePullToRefresh() {
  useEffect(() => {
    let startY = 0;
    let isPulling = false;

    const loader = () => document.getElementById('pull-loader');
    const onTouchStart = (e) => {
      if (window.scrollY === 0 && e.touches[0].clientY < 50) {
        startY = e.touches[0].clientY;
        isPulling = true;
        if (loader()) loader().classList.remove('active');
      }
    };

    const onTouchMove = (e) => {
      if (!isPulling) return;
      const currentY = e.touches[0].clientY;
      if (loader()) {
        const percent = Math.min((currentY - startY) / 120, 1);
        loader().style.opacity = percent;
        if (percent > 0.2) loader().classList.add('active');
        else loader().classList.remove('active');
      }
      if (currentY - startY > 120) {
        if (loader()) loader().style.opacity = 1;
        setTimeout(() => {
          window.location.reload();
        }, 150);
        isPulling = false;
      }
    };

    const onTouchEnd = () => {
      isPulling = false;
      if (loader()) {
        loader().classList.remove('active');
        loader().style.opacity = 0;
      }
    };

    window.addEventListener('touchstart', onTouchStart, { passive: true });
    window.addEventListener('touchmove', onTouchMove, { passive: true });
    window.addEventListener('touchend', onTouchEnd, { passive: true });

    return () => {
      window.removeEventListener('touchstart', onTouchStart);
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('touchend', onTouchEnd);
    };
  }, []);
}

export default usePullToRefresh;
