import type React from "react";
import { Post, PostAvatar, PostBody } from "@minamorl/root-ui";

interface ChatProps {
  children: React.ReactNode;
}

const Chat: React.FC<ChatProps> = ({ children }) => {
  // biome-ignore lint/suspicious/noExplicitAny: library types are unions of FC and function
  const Avatar = PostAvatar as any;
  // biome-ignore lint/suspicious/noExplicitAny: library types are unions of FC and function
  const Body = PostBody as any;

  return (
    <Post className="border-2 flex items-center space-x-4 rounded-xl bg-white px-4 py-8 border-none shadow-none">
      <Avatar
        as="img"
        src="/avatar.png"
        alt="Avatar"
        className="w-8 h-8 rounded-full"
      />
      <Body className="text-lg font-medium text-gray-700">{children}</Body>
    </Post>
  );
};

export default Chat;
