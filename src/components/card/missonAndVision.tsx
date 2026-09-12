import { missionAndVision } from '@/data/data';
import { Card } from '../ui/card';

export const MissionAndVision = () => {
  return (
    <div className="grid md:grid-cols-2 grid-cols-1 gap-4 md:px-0 px-4">
      {missionAndVision.map((item, index) => (
        <Card
          key={index}
          className="bg-white rounded-lg shadow-none border-dashed border-brand/25 px-6 space-y-0 py-6"
        >
          <div className="bg-brand w-max rounded-4xl flex items-center justify-start p-4">
            <span className="text-white text-xl">{item.icon}</span>
          </div>
          <h3 className="md:text-2xl font-bold text-xl tracking-tighter">
            {item.title}
          </h3>
          <p className="text-black font-semibold text-lg">{item.statement}</p>
          <p className="text-black opacity-65">{item.description}</p>
        </Card>
      ))}
    </div>
  );
};
