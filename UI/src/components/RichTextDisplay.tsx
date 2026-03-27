import DOMPurify from 'dompurify';

interface RichTextDisplayProps {
    content: string;
    className?: string;
    truncate?: boolean;
    maxLines?: number;
}

const stripHtml = (html: string) => html.replace(/<[^>]*>/g, '');

const RichTextDisplay = ({ content, className = '', truncate = false, maxLines = 2 }: RichTextDisplayProps) => {
    if (!content) return null;

    if (truncate) {
        const plain = stripHtml(content).trim();
        if (!plain) return null;
        return (
            <p className={`${className}`} style={{ display: '-webkit-box', WebkitLineClamp: maxLines, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                {plain}
            </p>
        );
    }

    const clean = DOMPurify.sanitize(content);
    return (
        <div
            className={`rich-text-content ${className}`}
            dangerouslySetInnerHTML={{ __html: clean }}
        />
    );
};

export { stripHtml };
export default RichTextDisplay;
