export type LearningPathSlug = 'civic' | 'green' | 'digital' | 'entrepreneurship';

const PATH_CATEGORY_CANDIDATES: Record<LearningPathSlug, string[]> = {
  civic: ['Civic Participation'],
  green: ['Green Economy Fundamentals', 'Climate Advocacy'],
  digital: ['Digital Skills', 'Civic Participation'],
  entrepreneurship: ['Digital Entrepreneurship'],
};

function isLearningPathSlug(value: string | null | undefined): value is LearningPathSlug {
  return value === 'civic' || value === 'green' || value === 'digital' || value === 'entrepreneurship';
}

export async function findStartingCourseIdForPath(
  supabase: any,
  pathSlug: string | null | undefined
): Promise<string | null> {
  if (!isLearningPathSlug(pathSlug)) return null;

  const { data: selectedPath } = await supabase
    .from('learning_paths')
    .select('id, category_name')
    .eq('slug', pathSlug)
    .maybeSingle();

  const pathId = (selectedPath as { id?: string | null } | null)?.id;

  if (pathId) {
    const { data: courseNode } = await supabase
      .from('skill_nodes')
      .select('course_id')
      .eq('path_id', pathId)
      .eq('node_type', 'course')
      .not('course_id', 'is', null)
      .order('order_index', { ascending: true })
      .limit(1)
      .maybeSingle();

    const courseId = (courseNode as { course_id?: string | null } | null)?.course_id;
    if (courseId) {
      const { data: publishedCourse } = await supabase
        .from('courses')
        .select('id')
        .eq('id', courseId)
        .eq('status', 'published')
        .maybeSingle();

      if ((publishedCourse as { id?: string } | null)?.id) {
        return courseId;
      }
    }
  }

  const categoryNames = [
    (selectedPath as { category_name?: string | null } | null)?.category_name,
    ...PATH_CATEGORY_CANDIDATES[pathSlug],
  ].filter((name): name is string => Boolean(name));

  for (const categoryName of [...new Set(categoryNames)]) {
    const { data: category } = await supabase
      .from('module_categories')
      .select('id')
      .eq('name', categoryName)
      .maybeSingle();

    const categoryId = (category as { id?: string } | null)?.id;
    if (!categoryId) continue;

    const { data: course } = await supabase
      .from('courses')
      .select('id')
      .eq('category_id', categoryId)
      .eq('status', 'published')
      .order('created_at', { ascending: true })
      .limit(1)
      .maybeSingle();

    const courseId = (course as { id?: string } | null)?.id;
    if (courseId) return courseId;
  }

  return null;
}
