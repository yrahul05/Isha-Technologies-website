export const HeroBanner = ({
  title,
  description,
}: {
  title: string;
  description?: string;
}) => {
  return (
    <div className="relative bg-gradient-to-r from-white to-blue-100 py-16 px-6 text-center">
      <h1 className="md:text-2xl text-xl tracking-tighter font-[900] uppercase mb-4">
        {title}
      </h1>
      {description && (
        <p className="md:text-lg text-base max-w-2xl mx-auto">{description}</p>
      )}

      {/* Gradient Bottom Border */}
      <div className="absolute bottom-0 left-0 w-full flex justify-center">
        <div className="h-[1px] w-full bg-brand to-transparent"></div>
      </div>
    </div>
  );
};
