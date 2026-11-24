import { categoryColor } from './todo';

// 게시글 카드가 쓰는 한 가지 모양으로 맞춘다. 타임라인 응답과 게시글 응답은 필드 이름이 다르다
// → { id, content, images, likeCount, commentCount, liked, createdAt, author, todo: { id?, name, isCompleted, categoryName?, color? } }

export function fromTimeline({ author, todo, post }) {
  return {
    id: post.postId,
    content: post.content,
    images: post.postImage,
    likeCount: post.likeCount,
    commentCount: post.commentCount,
    liked: post.liked,
    createdAt: post.createdAt,
    author,
    todo: {
      name: todo.title,
      isCompleted: todo.isCompleted,
      categoryName: todo.categoryName,
      color: categoryColor(todo.color),
    },
  };
}

// PostResponse에는 카테고리 이름·색이 없어 카테고리 목록(categoriesById)에서 찾는다
export function fromPost(post, categoriesById) {
  const category = categoriesById?.get(post.todo.categoryId);
  return {
    id: post.id,
    content: post.content,
    images: post.imageUrls,
    likeCount: post.likeCount,
    commentCount: post.commentCount,
    liked: post.liked,
    createdAt: post.createdAt,
    author: post.author,
    todo: {
      id: post.todo.id,
      name: post.todo.name,
      isCompleted: post.todo.isCompleted,
      categoryName: category?.name,
      color: category ? categoryColor(category.color) : null,
    },
  };
}
