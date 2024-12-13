import type { MetaFunction } from "@remix-run/node";

export const meta: MetaFunction = () => {
  return [
    { title: "Minamorl" },
    { name: "description", content: "Welcome to Minamorl's world!" },
  ];
};

const GitHubLink = () => <img src="logos/github.png" width="100"/>
const XLink = () => <img src="logos/x.png" width="40"/>


export default function Index() {
  return (
    <div className="flex flex-col min-h-screen bg-gray-100 relative w-full">
      {/* Background Sketch Images */}
      <div className="absolute top-0 left-0 w-full h-full">
        <img src="background.png" alt="Background" className="w-full h-full object-cover opacity-50" />
      </div>

      {/* Main Content */}
      <div className="relative z-10 text-center w-full max-w-screen-xl mx-auto px-4">
        <h1 className="text-left my-40 text-8xl font-bold text-gray-800">
          Hi! I&#39;m <br/><span className="text-pink-500">minamorl</span>!
        </h1>

        <ul className="mt-6 space-y-4">
          <Chat>Hi! I'm minamorl!</Chat>
          <Chat>This is my portfolio site. Let me explain...</Chat>
          <Chat>
            <p>Here's some links for my socials</p>
            <GitHubLink />
            <XLink />
          </Chat>

        </ul>

      </div>
    </div>
  );
}

const Chat: React.FC<React.PropsWithChildren> = ({ children }) => (
  <li className="border-2 flex items-center space-x-4 rounded-xl bg-white px-4 py-8 ">
    <img src="avatar.png" alt="Avatar" className="w-8 h-8 rounded-full" />
    <p className="text-lg font-medium text-gray-700">{children}</p>
  </li>
);

