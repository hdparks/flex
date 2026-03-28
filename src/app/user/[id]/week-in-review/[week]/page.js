'use client';
import { useParams, useRouter } from 'next/navigation';
import WeekInReview from '@/components/WeekInReview';

export default function WeekInReviewPage() {
  const params = useParams();
  const router = useRouter();
  const { id, week } = params;
  
  const [year, weekNum] = (week || '').split('-').map(Number);

  const handleClose = () => {
    router.push(`/user/${id}`);
  };

  if (!year || !weekNum) {
    return (
      <div className="container" style={{ textAlign: 'center', padding: '2rem' }}>
        <h2>Invalid week format</h2>
        <p>Use YYYY-WW format (e.g., 2026-13)</p>
        <button className="btn btn-primary" onClick={() => router.push(`/user/${id}`)}>
          Back to Profile
        </button>
      </div>
    );
  }

  return (
    <div className="container" style={{ paddingTop: '2rem', paddingBottom: '2rem' }}>
      <WeekInReview 
        userId={id} 
        week={weekNum} 
        year={year} 
        onClose={handleClose}
        isModal={false}
      />
    </div>
  );
}
