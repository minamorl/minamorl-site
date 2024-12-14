import type { MetaFunction } from "@remix-run/node";

export const meta: MetaFunction = () => {
  return [
    { title: "minamorl" },
    { name: "description", content: "Welcome to minamorl's world!" },
  ];
};

const GitHubLink = () => <img src="logos/github.png" width="50"/>
const XLink = () => <img src="logos/x.png" width="20"/>


export default function Index() {
  return (
    <div className="flex flex-col min-h-screen bg-gray-100 relative w-full">
      {/* Background Sketch Images */}
      <div className="absolute top-0 left-0 w-full h-full">
        <img src="background.png" alt="Background" className="w-full h-full object-cover opacity-50" />
      </div>

      {/* Main Content */}
      <div className="relative z-10 text-center w-full max-w-screen-xl mx-auto px-4">
        <h1 className="text-left my-40 text-6xl lg:text-8xl font-bold text-gray-800">
          Hi! I&#39;m <br/><span className="text-pink-500">minamorl</span>!
        </h1>

        <div className="mt-6 space-y-4 text-left">
          <Chat>Hi! I'm minamorl!</Chat>
          <Chat>This is my portfolio site. Let me explain about me...</Chat>
          <Chat>
            <p>Here's some links for my socials:</p>
            <ul className="py-4 align-baseline	">
              <li className="m-2 h-4"><a href="https://github.com/minamorl"><GitHubLink /></a></li>
              <li className="m-2 h-4"><a href="https://x.com/__not_exists__"><XLink /></a></li>
              <li className="m-2 h-4 text-pink-400 hover:text-pink-600"><a href="https://note.com/fumetsusha">note</a></li>
            </ul>
            For others, check my <a href="https://lit.link/notexists" className="text-pink-400 hover:text-pink-600">litlink</a>.
          </Chat>
          <Chat>
            My main career is a software engineer. <br /> I'm interested in web app development.
          </Chat>
        </div>
      </div>
      <footer>
        <div className="text-center text-gray-500 text-sm py-4">
          <p>© 2024 minamorl</p>
        </div>
      </footer>
    </div>
  );
}

const Chat: React.FC<React.PropsWithChildren> = ({ children }) => (
  <div className="border-2 flex items-center space-x-4 rounded-xl bg-white px-4 py-8 ">
    <img src="avatar.png" alt="Avatar" className="w-8 h-8 rounded-full" />
    <div className="text-lg font-medium text-gray-700">{children}</div>
  </div>
);

