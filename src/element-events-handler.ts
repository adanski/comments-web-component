import {CommentsById} from './comments-by-id';
import {CommentsOptions} from './comments-options';
import {CommentsProvider, OptionsProvider, ServiceProvider} from './provider';
import {TextareaService} from './subcomponent/textarea-service';
import {CommentUtil} from './comment-util';
import {findParentsBySelector} from './html-util';
import {isNil} from './util';

export interface ElementEventsHandler {
    closeDropdowns(e: UIEvent): void;
    preSavePastedAttachments(e: ClipboardEvent): void;
    saveOnKeydown(e: KeyboardEvent): void;
    saveEditableContent(e: Event): void;
    checkEditableContentForChange(e: Event): void;
    navigationElementClicked(e: MouseEvent): void;
    toggleNavigationDropdown(e: UIEvent): void;
    showMainCommentingField(e: UIEvent): void;
    hideMainCommentingField(e: UIEvent): void;
    increaseTextareaHeight(e: Event): void;
    textareaContentChanged(e: Event): void;
    removeCommentingField(e: UIEvent): void;
    postComment(e: UIEvent): void;
    putComment(e: UIEvent): void;
    deleteComment(e: UIEvent): void;
    preDeleteAttachment(e: UIEvent): void;
    fileInputChanged(e: Event): void;
    upvoteComment(e: UIEvent): void;
    hashtagClicked(e: MouseEvent): void;
    pingClicked(e: MouseEvent): void;
    toggleReplies(e: UIEvent): void;
    replyButtonClicked(e: MouseEvent): void;
    editButtonClicked(e: MouseEvent): void;
    showDroppableOverlay(e: UIEvent): void;
    handleDragEnter(e: DragEvent): void;
    handleDragLeaveForOverlay(e: DragEvent): void;
    handleDragLeaveForDroppable(e: DragEvent): void;
    handleDragOverForOverlay(e: DragEvent): void;
    handleDrop(e: DragEvent): void;
    stopPropagation(e: Event): void;
}

export class DefaultElementEventsHandler implements ElementEventsHandler {

    private readonly options: CommentsOptions;
    private readonly commentsById: CommentsById;
    private readonly subcomponentUtil: TextareaService;
    private readonly commentUtil: CommentUtil;

    constructor(private readonly container: HTMLDivElement) {
        this.options = OptionsProvider.get(container)!;
        this.commentsById = CommentsProvider.get(container)!;
        this.subcomponentUtil = ServiceProvider.get(container, TextareaService);
        this.commentUtil = ServiceProvider.get(container, CommentUtil);
    }

    closeDropdowns(): void {
        this.container.find('.dropdown').hide();
    }

    preSavePastedAttachments(e: ClipboardEvent): void {
        const clipboardData = e.clipboardData!;
        const files: FileList = clipboardData.files;

        // Browsers only support pasting one file
        if (files?.length === 1) {

            // Select correct commenting field
            const parentCommentingField: HTMLElement | null = findParentsBySelector(e.target as HTMLElement, '.commenting-field').first();
            if (!isNil(parentCommentingField)) {
                this.preSaveAttachments(files, parentCommentingField);
            }


            e.preventDefault();
        }
    }

    private preSaveAttachments(files: FileList, commentingField: HTMLElement = this.container.querySelector('.commenting-field.main')!): void {
        // Elements
        const uploadButton: HTMLElement = commentingField.querySelector('.control-row .upload')!;
        const attachmentsContainer: HTMLElement = commentingField.querySelector('.control-row .attachments')!;

        if (files.length) {
            // Create attachment models
            let attachments: any[] = [...files].map(file => ({
                mime_type: file.type,
                file: file
            }));

            // Filter out already added attachments
            const existingAttachments: any[] = this.subcomponentUtil.getAttachmentsFromCommentingField(commentingField);
            attachments = attachments.filter(attachment => {
                let duplicate = false;

                // Check if the attachment name and size matches with an already added attachment
                for (let i = 0; i < existingAttachments.length; i++) {
                    const existingAttachment = existingAttachments[i];
                    if (attachment.file.name === existingAttachment.file.name && attachment.file.size === existingAttachment.file.size) {
                        duplicate = true;
                        break;
                    }
                }

                return !duplicate;
            });

            // Ensure that the main commenting field is shown if attachments were added to that
            if (commentingField.classList.contains('main')) {
                commentingField.querySelector('.textarea')!.dispatchEvent(new MouseEvent('click'));
            }

            // Set button state to loading
            this.subcomponentUtil.setButtonState(uploadButton, false, true);

            // Validate attachments
            this.options.validateAttachments(attachments, validatedAttachments => {

                if (validatedAttachments.length) {
                    // Create attachment tags
                    validatedAttachments.forEach(attachment => {
                        const attachmentTag = this.createAttachmentTagElement(attachment, true);
                        attachmentsContainer.append(attachmentTag);
                    });

                    // Check if save button needs to be enabled
                    this.toggleSaveButton(commentingField);
                }

                // Reset button state
                this.subcomponentUtil.setButtonState(uploadButton, true, false);
            });
        }

        // Clear the input field
        uploadButton.find('input').val('');
    }

    saveOnKeydown(e: KeyboardEvent): void {
        // Save comment on cmd/ctrl + enter
        if (e.keyCode === 13) {
            const metaKey = e.metaKey || e.ctrlKey;
            if (this.options.postCommentOnEnter || metaKey) {
                const el = $(e.currentTarget);
                el.siblings('.control-row').find('.save').trigger('click');
                e.stopPropagation();
                e.preventDefault();
            }
        }
    }

    saveEditableContent(e: Event): void {
        const el = $(e.currentTarget);
        el.data('before', el.html());
    }

    checkEditableContentForChange(e: Event): void {
        const el = $(e.currentTarget);

        if (el.data('before') != el.html()) {
            el.data('before', el.html());
            el.trigger('change');
        }
    }

    navigationElementClicked(e: MouseEvent): void {
        const navigationEl = $(e.currentTarget);
        const sortKey = navigationEl.data().sortKey;

        // Sort the comments if necessary
        if (sortKey === 'attachments') {
            this.createAttachments();
        } else {
            this.sortAndReArrangeComments(sortKey);
        }

        // Save the current sort key
        this.currentSortKey = sortKey;
        this.showActiveSort();
    }

    private sortAndReArrangeComments(sortKey: 'popularity' | 'oldest' | 'newest'): void {
        const commentList: HTMLElement = this.container.querySelector('#comment-list')!;

        // Get main level comments
        const mainLevelComments: Record<string, any>[] = this.getComments().filter(commentModel => !commentModel.parent);
        this.sortComments(mainLevelComments, sortKey);

        // Rearrange the main level comments
        mainLevelComments.forEach(commentModel => {
            const commentEl: HTMLElement = commentList.querySelector(`> li.comment[data-id=${commentModel.id}]`)!;
            commentList.append(commentEl);
        });
    }

    toggleNavigationDropdown(e: UIEvent): void {
        // Prevent closing immediately
        e.stopPropagation();

        const dropdown = $(e.currentTarget).find('~ .dropdown');
        dropdown.toggle();
    }

    showMainCommentingField(e: UIEvent): void {
        const mainTextarea = $(e.currentTarget);
        mainTextarea.siblings('.control-row').show();
        mainTextarea.parent().find('.close').show();
        mainTextarea.parent().find('.upload.inline-button').hide();
        mainTextarea.focus();
    }

    hideMainCommentingField(e: UIEvent): void {
        const closeButton = $(e.currentTarget);
        const commentingField = this.$el.find('.commenting-field.main');
        const mainTextarea = commentingField.find('.textarea');
        const mainControlRow = commentingField.find('.control-row');

        // Clear text area
        this.clearTextarea(mainTextarea);

        // Clear attachments
        commentingField.find('.attachments').empty();

        // Toggle save button
        this.toggleSaveButton(commentingField);

        // Adjust height
        this.adjustTextareaHeight(mainTextarea, false);

        mainControlRow.hide();
        closeButton.hide();
        mainTextarea.parent().find('.upload.inline-button').show();
        mainTextarea.blur();
    }

    increaseTextareaHeight(e: Event): void {
        const textarea = $(e.currentTarget);
        this.adjustTextareaHeight(textarea, true);
    }

    textareaContentChanged(e: Event): void {
        const textarea = $(e.currentTarget);

        // Update parent id if reply-to tag was removed
        if (!textarea.find('.reply-to.tag').length) {
            const commentId = textarea.attr('data-comment');

            // Case: editing comment
            if (commentId) {
                const parentComments: HTMLElement[] = findParentsBySelector(textarea, 'li.comment');
                if (parentComments.length > 1) {
                    const parentId = parentComments[parentComments.length - 1].data('id');
                    textarea.attr('data-parent', parentId);
                }

                // Case: new comment
            } else {
                const parentId = findParentsBySelector(textarea, 'li.comment').last().data('id');
                textarea.attr('data-parent', parentId);
            }
        }

        // Move close button if scrollbar is visible
        const commentingField = findParentsBySelector(textarea, '.commenting-field').first();
        if (textarea[0].scrollHeight > textarea.outerHeight()) {
            commentingField.addClass('commenting-field-scrollable');
        } else {
            commentingField.removeClass('commenting-field-scrollable');
        }

        // Check if save button needs to be enabled
        this.toggleSaveButton(commentingField);
    }

    removeCommentingField(e: UIEvent): void {
        const closeButton = $(e.currentTarget);

        // Remove edit class from comment if user was editing the comment
        const textarea = closeButton.siblings('.textarea');
        if (textarea.attr('data-comment')) {
            findParentsBySelector(closeButton, 'li.comment').first().removeClass('edit');
        }

        // Remove the field
        const commentingField = findParentsBySelector(closeButton, '.commenting-field').first();
        commentingField.remove();
    }

    postComment(e: UIEvent): void {
        const sendButton = $(e.currentTarget);
        const commentingField = findParentsBySelector(sendButton, '.commenting-field').first();

        // Set button state to loading
        this.setButtonState(sendButton, false, true);

        // Create comment JSON
        const commentJSON = this.createCommentJSON(commentingField);

        // Reverse mapping
        commentJSON = this.applyExternalMappings(commentJSON);

        const success = commentJSON => {
            this.createComment(commentJSON);
            commentingField.find('.close').trigger('click');

            // Reset button state
            this.setButtonState(sendButton, false, false);
        };

        const error = () => {
            // Reset button state
            this.setButtonState(sendButton, true, false);
        };

        this.options.postComment(commentJSON, success, error);
    }

    putComment(e: UIEvent): void {
        const saveButton = $(e.currentTarget);
        const commentingField = findParentsBySelector(saveButton, '.commenting-field').first();
        const textarea = commentingField.find('.textarea');

        // Set button state to loading
        this.setButtonState(saveButton, false, true);

        // Use a clone of the existing model and update the model after succesfull update
        let commentJSON = Object.assign({}, this.commentsById[textarea.attr('data-comment')]);
        Object.assign(commentJSON, {
            parent: textarea.attr('data-parent') || null,
            content: this.getTextareaContent(textarea),
            pings: this.getPings(textarea),
            modified: new Date().getTime(),
            attachments: this.getAttachmentsFromCommentingField(commentingField)
        });

        // Reverse mapping
        commentJSON = this.applyExternalMappings(commentJSON);

        const success = commentJSON => {
            // The outermost parent can not be changed by editing the comment so the childs array
            // of parent does not require an update

            const commentModel = this.createCommentModel(commentJSON);

            // Delete childs array from new comment model since it doesn't need an update
            delete commentModel['childs'];
            this.updateCommentModel(commentModel);

            // Close the editing field
            commentingField.find('.close').trigger('click');

            // Re-render the comment
            this.reRenderComment(commentModel.id);

            // Reset button state
            this.setButtonState(saveButton, false, false);
        };

        const error = () => {
            // Reset button state
            this.setButtonState(saveButton, true, false);
        };

        this.options.putComment(commentJSON, success, error);
    }

    private updateCommentModel(commentModel: Record<string, any>): void {
        Object.assign(this.commentsById[commentModel.id], commentModel);
    }

    private reRenderComment(id: string): void {
        const commentModel: Record<string, any> = this.commentsById[id];
        const commentElements = this.container.querySelectorAll(`li.comment[data-id="${commentModel.id}"]`);

        commentElements.forEach((commentEl) => {
            const commentWrapper = this.createCommentWrapperElement(commentModel);
            commentEl.querySelector('.comment-wrapper')!.replaceWith(commentWrapper);
        });
    }

    deleteComment(e: UIEvent): void {
        const deleteButton = $(e.currentTarget);
        const commentEl = findParentsBySelector(deleteButton, '.comment').first();
        let commentJSON = Object.assign({}, this.commentsById[commentEl.attr('data-id')]);
        const commentId = commentJSON.id;
        const parentId = commentJSON.parent;

        // Set button state to loading
        this.setButtonState(deleteButton, false, true);

        // Reverse mapping
        commentJSON = this.applyExternalMappings(commentJSON);

        const success = () => {
            this.removeComment(commentId);
            if (parentId) this.reRenderCommentActionBar(parentId);

            // Reset button state
            this.setButtonState(deleteButton, false, false);
        };

        const error = () => {
            // Reset button state
            this.setButtonState(deleteButton, true, false);
        };

        this.options.deleteComment(commentJSON, success, error);
    }

    private removeComment(commentId: string): void {
        this.commentUtil.removeComment(commentId, parentEl => {
            // Update the toggle all button
            this.updateToggleAllButton(parentEl);
        });
    }

    private reRenderCommentActionBar(id: string): void {
        const commentModel: Record<string, any> = this.commentsById[id];
        const commentElements = this.container.querySelectorAll(`li.comment[data-id="${commentModel.id}"]`);

        commentElements.forEach((commentEl) => {
            const commentWrapper = this.createCommentWrapperElement(commentModel);
            commentEl.querySelector('.actions')!.replaceWith(commentWrapper.find('.actions'));
        });
    }

    preDeleteAttachment(e: UIEvent) {
        const commentingField = findParentsBySelector(e.currentTarget as HTMLElement, '.commenting-field').first();
        const attachmentEl = findParentsBySelector(e.currentTarget as HTMLElement, '.attachment').first();
        attachmentEl.remove();

        // Check if save button needs to be enabled
        this.toggleSaveButton(commentingField);
    }

    fileInputChanged(e: Event): void {
        const input: HTMLInputElement = e.currentTarget as HTMLInputElement;
        const files = input.files!;
        const commentingField = findParentsBySelector(input, '.commenting-field').first();
        this.preSaveAttachments(files, commentingField);
    }

    upvoteComment(e: UIEvent): void {
        const commentEl = findParentsBySelector(e.currentTarget as HTMLElement, 'li.comment').first();
        const commentModel = commentEl.data().model;

        // Check whether user upvoted the comment or revoked the upvote
        const previousUpvoteCount = commentModel.upvoteCount;
        let newUpvoteCount;
        if (commentModel.userHasUpvoted) {
            newUpvoteCount = previousUpvoteCount - 1;
        } else {
            newUpvoteCount = previousUpvoteCount + 1;
        }

        // Show changes immediately
        commentModel.userHasUpvoted = !commentModel.userHasUpvoted;
        commentModel.upvoteCount = newUpvoteCount;
        this.reRenderUpvotes(commentModel.id);

        // Reverse mapping
        let commentJSON = Object.assign({}, commentModel);
        commentJSON = this.applyExternalMappings(commentJSON);

        const success = commentJSON => {
            const commentModel = this.createCommentModel(commentJSON);
            this.updateCommentModel(commentModel);
            this.reRenderUpvotes(commentModel.id);
        };

        const error = () => {
            // Revert changes
            commentModel.userHasUpvoted = !commentModel.userHasUpvoted;
            commentModel.upvoteCount = previousUpvoteCount;
            this.reRenderUpvotes(commentModel.id);
        };

        this.options.upvoteComment(commentJSON, success, error);
    }

    private reRenderUpvotes(id: string): void {
        const commentModel: Record<string, any> = this.commentsById[id];
        const commentElements = this.container.querySelectorAll(`li.comment[data-id="${commentModel.id}"]`);

        commentElements.forEach(commentEl => {
            const upvotes = this.createUpvoteElement(commentModel);
            commentEl.querySelector('.upvote')!.replaceWith(upvotes);
        });
    }

    hashtagClicked(e: MouseEvent): void {
        const el = $(e.currentTarget);
        const value = el.attr('data-value');
        this.options.hashtagClicked(value);
    }

    pingClicked(e: MouseEvent): void {
        const el = $(e.currentTarget);
        const value = el.attr('data-value');
        this.options.pingClicked(value);
    }

    toggleReplies(e: UIEvent): void {
        const el = $(e.currentTarget);
        el.siblings('.togglable-reply').toggleClass('visible');
        this.setToggleAllButtonText(el, true);
    }

    replyButtonClicked(e: MouseEvent): void {
        const replyButton = $(e.currentTarget);
        const outermostParent = findParentsBySelector(replyButton, 'li.comment').last();
        const parentId = findParentsBySelector(replyButton, '.comment').first().data().id;

        // Remove existing field
        let replyField = outermostParent.find('.child-comments > .commenting-field');
        if (replyField.length) replyField.remove();
        const previousParentId = replyField.find('.textarea').attr('data-parent');

        // Create the reply field (do not re-create)
        if (previousParentId != parentId) {
            replyField = this.createCommentingFieldElement(parentId);
            outermostParent.find('.child-comments').append(replyField);

            // Move cursor to end
            const textarea = replyField.find('.textarea');
            this.moveCursorToEnd(textarea);

            // Ensure element stays visible
            this.ensureElementStaysVisible(replyField);
        }
    }

    private moveCursorToEnd(element: HTMLElement): void {
        // Trigger input to adjust size
        element.dispatchEvent(new InputEvent('input'));

        // Scroll to bottom
        element.scrollTop = element.scrollHeight;

        // Move cursor to end
        const range: Range = document.createRange();
        range.selectNodeContents(element);
        range.collapse(false);
        const sel: Selection = getSelection() as Selection;
        sel.removeAllRanges();
        sel.addRange(range);

        // Focus
        element.focus();
    }

    private ensureElementStaysVisible(el: HTMLElement): void {
        const scrollContainer: HTMLElement = this.options.scrollContainer;
        const maxScrollTop: number = el.offsetTop;
        const minScrollTop: number = el.offsetTop + el.offsetHeight - scrollContainer.offsetHeight;

        if (scrollContainer.scrollTop > maxScrollTop) { // Case: element hidden above scoll area
            scrollContainer.scrollTop = maxScrollTop;
        } else if (scrollContainer.scrollTop < minScrollTop) { // Case: element hidden below scoll area
            scrollContainer.scrollTop = minScrollTop;
        }

    }

    editButtonClicked(e: MouseEvent): void {
        const editButton = $(e.currentTarget);
        const commentEl = findParentsBySelector(editButton, 'li.comment').first();
        const commentModel = commentEl.data().model;
        commentEl.addClass('edit');

        // Create the editing field
        const editField = this.createCommentingFieldElement(commentModel.parent, commentModel.id);
        commentEl.find('.comment-wrapper').first().append(editField);

        // Append original content
        const textarea: HTMLElement = editField.querySelector('.textarea');
        textarea.setAttribute('data-comment', commentModel.id);

        // Escaping HTML
        textarea.append(this.getFormattedCommentContent(commentModel, true));

        // Move cursor to end
        this.moveCursorToEnd(textarea);

        // Ensure element stays visible
        this.ensureElementStaysVisible(editField);
    }

    showDroppableOverlay(e: UIEvent): void {
        if (this.options.enableAttachments) {
            this.container.querySelectorAll<HTMLElement>('.droppable-overlay')
                .forEach(element => {
                    element.style.top = this.container.scrollTop + 'px';
                    element.style.display = 'block';
                });
            this.container.classList.add('drag-ongoing');
        }
    }

    handleDragEnter(e: DragEvent): void {
        const currentTarget: HTMLElement = e.currentTarget as HTMLElement;
        let count: number = Number(currentTarget.getAttribute('data-dnd-count')) || 0;
        currentTarget.setAttribute('data-dnd-count', `${++count}`);
        currentTarget.classList.add('drag-over');
    }

    handleDragLeaveForOverlay(e: DragEvent): void {
        this.handleDragLeave(e, () => {
            this.hideDroppableOverlay();
        });
    }

    private handleDragLeave(e: DragEvent, onDragLeft?: Function): void {
        const currentTarget: HTMLElement = e.currentTarget as HTMLElement;
        let count: number = Number(currentTarget.getAttribute('data-dnd-count'));
        currentTarget.setAttribute('data-dnd-count', `${--count}`);

        if (count === 0) {
            (e.currentTarget as HTMLElement).classList.remove('drag-over');
            onDragLeft?.();
        }
    }

    private hideDroppableOverlay(): void {
        this.container.querySelectorAll<HTMLElement>('.droppable-overlay')
            .forEach(element => element.style.display = 'none');
        this.container.classList.remove('drag-ongoing');
    }

    handleDragLeaveForDroppable(e: DragEvent): void {
        this.handleDragLeave(e);
    }

    handleDragOverForOverlay(e: DragEvent): void {
        e.stopPropagation();
        e.preventDefault();
        e.dataTransfer!.dropEffect = 'copy';
    }

    handleDrop(e: DragEvent): void {
        e.preventDefault();

        // Reset DND counts
        e.target!.dispatchEvent(new DragEvent('dragleave'));

        // Hide the overlay and upload the files
        this.hideDroppableOverlay();
        this.preSaveAttachments(e.dataTransfer!.files);
    }

    stopPropagation(e: Event) {
        e.stopPropagation();
    }
}
