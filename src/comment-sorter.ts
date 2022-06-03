import {CommentsOptions} from './comments-options';
import {OptionsProvider} from './provider';

export class CommentSorter {

    private readonly options: CommentsOptions;

    constructor(private readonly container: HTMLDivElement) {
        this.options = OptionsProvider.get(container)!;
    }

    sortComments(comments: Record<string, any>[], sortKey: 'popularity' | 'oldest' | 'newest' | 'attachments'): void {
        if (sortKey === 'popularity') { // Sort by popularity
            comments.sort((commentA, commentB) => {
                let pointsOfA = commentA.childs.length;
                let pointsOfB = commentB.childs.length;

                if (this.options.enableUpvoting) {
                    pointsOfA += commentA.upvoteCount;
                    pointsOfB += commentB.upvoteCount;
                }

                if (pointsOfB != pointsOfA) {
                    return pointsOfB - pointsOfA;
                } else {
                    // Return newer if popularity is the same
                    const createdA = new Date(commentA.created).getTime();
                    const createdB = new Date(commentB.created).getTime();
                    return createdB - createdA;
                }
            });
        } else { // Sort by date
            comments.sort((commentA, commentB) => {
                const createdA = new Date(commentA.created).getTime();
                const createdB = new Date(commentB.created).getTime();
                if (sortKey == 'oldest') {
                    return createdA - createdB;
                } else {
                    return createdB - createdA;
                }
            });
        }
    }
}
