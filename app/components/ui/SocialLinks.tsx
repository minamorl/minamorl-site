import type React from "react";

const GitHubLink = () => <img src="logos/github.png" alt="GitHub" width="70" />;

const LinkedinLink = () => (
  <img src="/svg/linkedin.svg" alt="LinkedIn Icon" width="70" />
);

const SocialLinks: React.FC = () => (
  <>
    <div className="my-1">
      <a href="https://github.com/minamorl" className="m-4">
        <GitHubLink />
      </a>
    </div>
    <div className="my-1">
      <a href="https://www.linkedin.com/in/shuji-iwata-3110b235a/">
        <LinkedinLink />
      </a>
    </div>
  </>
);

export default SocialLinks;
export { GitHubLink, LinkedinLink };
