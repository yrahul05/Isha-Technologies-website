import { steps } from "@/data/data";
import { BsArrow90DegLeft, BsArrow90DegRight } from "react-icons/bs";

export const ProcessOfSteps = () => {
  return (
    <section className="relative w-full max-w-5xl mx-auto md:px-0 px-4">
      {steps.map((step, idx) => (
        <div key={idx} className="relative flex flex-col items-center">
          <div
            className={`flex items-center justify-between w-full mb-12 ${idx % 2 === 0 ? "flex-row" : "flex-row-reverse"
              }`}
          >
            {/* Step Card */}
            <div className="w-1/2">
              <div className="card-hover bg-white border border-dashed border-brand text-black rounded-2xl shadow-md p-6">
                <div className="flex flex-col items-start gap-3 mb-2">
                  <span className="card-accent text-lg text-brand">
                    {step.icon}
                  </span>
                  <h3 className="text-xl font-semibold text-black">
                    {step.title}
                  </h3>
                </div>
                <p className="text-gray-600 text-sm">{step.description}</p>
              </div>
            </div>

            {/* Big Dashed Arrow */}
            {idx !== steps.length - 1 && (
              <div className="w-1/2 flex justify-center relative">
                {idx % 2 === 0 ? (
                  <>
                    <BsArrow90DegRight className="absolute top-[-4px] bg-white text-brand text-6xl rotate-90" />
                    <div className="absolute w-1/2 left-0 top-1/2 border-dashed border-[2px] border-brand/50 -z-0" />
                  </>

                ) : (
                  <>
                    <BsArrow90DegLeft className="absolute top-[-4px] text-brand text-6xl -rotate-90 bg-white" />
                    <div className="absolute w-1/2 right-0 top-1/2 border-dashed border-[2px] border-brand/50 -z-0" />
                  </>

                )}

              </div>
            )}
          </div>
        </div>
      ))}
    </section>
  );
};

